from __future__ import annotations

import hashlib
import html
import json
import os
import re
import shutil
import subprocess
import urllib.parse
import urllib.request
from dataclasses import dataclass
from datetime import datetime
from html.parser import HTMLParser
from pathlib import Path
from typing import Iterable

import kb_core
from kb_markitdown import MarkItDownOfflineAdapter


TEXT_EXTENSIONS = {".txt", ".md", ".markdown", ".html", ".htm"}
WORD_EXTENSIONS = {".doc", ".docx", ".odt", ".rtf"}
PDF_EXTENSIONS = {".pdf"}
IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp", ".heic"}
SUPPORTED_FILE_EXTENSIONS = TEXT_EXTENSIONS | WORD_EXTENSIONS | PDF_EXTENSIONS | IMAGE_EXTENSIONS
REQUIRED_MANIFEST_FIELDS = {
    "ingest_id",
    "target_type",
    "domain",
    "source_title",
    "source_locator",
    "content_hash",
    "duplicate_status",
    "relation_type",
    "related_pages",
    "review_status",
}
REQUIRED_DRAFT_FRONTMATTER_KEYS = {
    "title",
    "type",
    "status",
    "created_at",
    "updated_at",
    "source_refs",
    "related",
    "domain",
    "industries",
    "categories",
}


@dataclass(frozen=True)
class IngestPaths:
    repo_root: Path
    wiki_root: Path
    raw_root: Path
    output_root: Path
    page_layout: dict[str, dict[str, object]]

    @property
    def source_dir(self) -> Path:
        return Path(self.page_layout["source"]["dir"])

    @property
    def canonical_dirs(self) -> set[str]:
        return {str(Path(spec["dir"]).name) for spec in self.page_layout.values()}


@dataclass(frozen=True)
class IngestTarget:
    raw_target: str
    target_type: str
    source_locator: str
    locator_slug: str
    filename_hint: str
    file_extension: str


@dataclass(frozen=True)
class ExtractionResult:
    extracted_text: str
    extracted_markdown: str
    extraction_mode: str
    extractor_name: str
    extractor_version: str
    title_hint: str
    notes: list[str]
    needs_browser_capture: bool
    weak_text: bool


@dataclass(frozen=True)
class DraftBundle:
    root_dir: Path
    wiki_root: Path
    review_summary_path: Path
    log_entry_path: Path
    draft_pages: list[Path]


@dataclass(frozen=True)
class IngestRecord:
    manifest: dict[str, object]
    manifest_path: Path
    bundle_dir: Path
    draft_bundle: DraftBundle


@dataclass(frozen=True)
class ApplyResult:
    record: IngestRecord
    applied_paths: list[Path]


@dataclass(frozen=True)
class ApplyPlan:
    record: IngestRecord
    rendered_pages: list[tuple[Path, str]]
    updated_manifest: dict[str, object]

    @property
    def applied_paths(self) -> list[Path]:
        return [path for path, _ in self.rendered_pages]


class HTMLTextExtractor(HTMLParser):
    BLOCK_TAGS = {
        "article",
        "blockquote",
        "body",
        "br",
        "div",
        "h1",
        "h2",
        "h3",
        "h4",
        "h5",
        "h6",
        "header",
        "footer",
        "li",
        "main",
        "ol",
        "p",
        "section",
        "table",
        "tr",
        "ul",
    }
    IGNORE_TAGS = {"script", "style", "noscript"}

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self._ignore_depth = 0
        self._tag_stack: list[str] = []
        self.parts: list[str] = []
        self.title_parts: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        lower = tag.lower()
        self._tag_stack.append(lower)
        if lower in self.IGNORE_TAGS:
            self._ignore_depth += 1
        if lower in self.BLOCK_TAGS:
            self.parts.append("\n")

    def handle_endtag(self, tag: str) -> None:
        lower = tag.lower()
        if self._tag_stack:
            self._tag_stack.pop()
        if lower in self.IGNORE_TAGS and self._ignore_depth > 0:
            self._ignore_depth -= 1
        if lower in self.BLOCK_TAGS:
            self.parts.append("\n")

    def handle_data(self, data: str) -> None:
        if self._ignore_depth > 0:
            return
        compact = re.sub(r"\s+", " ", data).strip()
        if not compact:
            return
        if self._tag_stack and self._tag_stack[-1] == "title":
            self.title_parts.append(compact)
        self.parts.append(compact)


def build_ingest_paths(
    repo_root: Path,
    wiki_root: Path,
    raw_root: Path,
    output_root: Path,
    page_layout: dict[str, dict[str, object]],
) -> IngestPaths:
    return IngestPaths(
        repo_root=repo_root,
        wiki_root=wiki_root,
        raw_root=raw_root,
        output_root=output_root,
        page_layout=page_layout,
    )


def repo_paths(paths: IngestPaths) -> kb_core.RepoPaths:
    return kb_core.build_repo_paths(paths.repo_root, paths.wiki_root, paths.raw_root, paths.output_root, paths.page_layout)


def now_local() -> datetime:
    return datetime.now().astimezone()


def today_str() -> str:
    return now_local().date().isoformat()


def timestamp_str() -> str:
    return now_local().isoformat(timespec="seconds")


def atomic_write_text(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temp_path = path.with_name(f".{path.name}.tmp")
    temp_path.write_text(content, encoding="utf-8")
    os.replace(temp_path, path)


def atomic_write_json(path: Path, payload: dict[str, object]) -> None:
    atomic_write_text(path, json.dumps(payload, ensure_ascii=False, indent=2) + "\n")


def normalize_url(target: str) -> str:
    parsed = urllib.parse.urlsplit(target)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        raise ValueError(f"unsupported url target: {target}")
    normalized_path = parsed.path or "/"
    return urllib.parse.urlunsplit(
        (
            parsed.scheme.lower(),
            parsed.netloc.lower(),
            normalized_path,
            parsed.query,
            "",
        )
    )


def normalize_target(target: str) -> IngestTarget:
    parsed = urllib.parse.urlsplit(target)
    if parsed.scheme in {"http", "https"}:
        source_locator = normalize_url(target)
        filename_hint = url_filename_hint(source_locator)
        suffix = Path(filename_hint).suffix.lower()
        if not suffix:
            suffix = ".html"
            filename_hint += suffix
        return IngestTarget(
            raw_target=target,
            target_type="url",
            source_locator=source_locator,
            locator_slug=kb_core.slugify(source_locator) or "url",
            filename_hint=filename_hint,
            file_extension=suffix,
        )

    file_path = Path(target).expanduser().resolve()
    if not file_path.exists() or not file_path.is_file():
        raise ValueError(f"target file not found: {target}")
    source_locator = str(file_path)
    suffix = file_path.suffix.lower()
    return IngestTarget(
        raw_target=target,
        target_type="file",
        source_locator=source_locator,
        locator_slug=kb_core.slugify(file_path.stem) or "file",
        filename_hint=file_path.name,
        file_extension=suffix,
    )


def url_filename_hint(source_locator: str) -> str:
    parsed = urllib.parse.urlsplit(source_locator)
    candidate = Path(parsed.path).name.strip()
    if candidate:
        return candidate
    host = kb_core.slugify(parsed.netloc) or "page"
    return f"{host}.html"


def guess_extension_from_content_type(content_type: str, fallback: str) -> str:
    compact = content_type.lower()
    if "html" in compact:
        return ".html"
    if "markdown" in compact:
        return ".md"
    if "plain" in compact or "text/" in compact:
        return ".txt"
    if "pdf" in compact:
        return ".pdf"
    if "png" in compact:
        return ".png"
    if "jpeg" in compact or "jpg" in compact:
        return ".jpg"
    if "webp" in compact:
        return ".webp"
    return fallback


def infer_title(source_locator: str, title_hint: str, fallback_slug: str, target_type: str) -> str:
    if title_hint.strip():
        hinted_title = title_hint.strip()
    else:
        hinted_title = ""
    parsed = urllib.parse.urlsplit(source_locator)
    if parsed.scheme in {"http", "https"}:
        if hinted_title:
            return hinted_title
        tail = Path(parsed.path).stem.strip()
        if tail:
            return tail.replace("-", " ").replace("_", " ").strip().title()
        return parsed.netloc
    file_path = Path(source_locator)
    if file_path.stem.strip():
        return file_path.stem.replace("-", " ").replace("_", " ").strip()
    if hinted_title and target_type == "file":
        return hinted_title
    return fallback_slug.replace("-", " ").strip().title()


def content_hash_for_bytes(payload: bytes) -> str:
    return hashlib.sha256(payload).hexdigest()


def generate_ingest_id(locator_slug: str, content_hash: str) -> str:
    stamp = now_local().strftime("%Y%m%dT%H%M%S%f")
    short_locator = locator_slug[:24].strip("-") or "ingest"
    return f"{stamp}-{short_locator[:16]}-{content_hash[:8]}"


def ingest_id_exists(paths: IngestPaths, ingest_id: str) -> bool:
    return any(paths.raw_root.glob(f"domains/*/ingest/{ingest_id}/manifest.json"))


def allocate_ingest_id(paths: IngestPaths, locator_slug: str, content_hash: str) -> str:
    base_id = generate_ingest_id(locator_slug, content_hash)
    if not ingest_id_exists(paths, base_id):
        return base_id
    sequence = 2
    while True:
        candidate = f"{base_id}-{sequence:02d}"
        if not ingest_id_exists(paths, candidate):
            return candidate
        sequence += 1


def bundle_dir(paths: IngestPaths, domain: str, ingest_id: str) -> Path:
    return paths.raw_root / "domains" / domain / "ingest" / ingest_id


def draft_bundle_dir(paths: IngestPaths, ingest_id: str) -> Path:
    return paths.output_root / "ingest-drafts" / ingest_id


def manifest_path_for(paths: IngestPaths, domain: str, ingest_id: str) -> Path:
    return bundle_dir(paths, domain, ingest_id) / "manifest.json"


def load_manifest(path: Path) -> dict[str, object]:
    return json.loads(path.read_text(encoding="utf-8"))


def find_manifest_path(paths: IngestPaths, ingest_id: str) -> Path:
    matches = sorted(paths.raw_root.glob(f"domains/*/ingest/{ingest_id}/manifest.json"))
    if not matches:
        raise ValueError(f"ingest manifest not found: {ingest_id}")
    if len(matches) > 1:
        raise ValueError(f"multiple ingest manifests found: {ingest_id}")
    return matches[0]


def load_ingest_record(paths: IngestPaths, ingest_id: str) -> IngestRecord:
    manifest_path = find_manifest_path(paths, ingest_id)
    manifest = load_manifest(manifest_path)
    validate_manifest_shape(manifest)
    draft_bundle = build_draft_bundle(paths, manifest)
    return IngestRecord(
        manifest=manifest,
        manifest_path=manifest_path,
        bundle_dir=manifest_path.parent,
        draft_bundle=draft_bundle,
    )


def build_draft_bundle(paths: IngestPaths, manifest: dict[str, object]) -> DraftBundle:
    ingest_id = str(manifest["ingest_id"])
    root_dir = draft_bundle_dir(paths, ingest_id)
    wiki_root = root_dir / "wiki"
    review_summary_path = root_dir / "review-summary.md"
    log_entry_path = root_dir / "log-entry.md"
    draft_pages = sorted(path for path in wiki_root.rglob("*.md") if path.is_file())
    return DraftBundle(
        root_dir=root_dir,
        wiki_root=wiki_root,
        review_summary_path=review_summary_path,
        log_entry_path=log_entry_path,
        draft_pages=draft_pages,
    )


def validate_manifest_shape(manifest: dict[str, object]) -> None:
    missing = sorted(REQUIRED_MANIFEST_FIELDS - set(manifest))
    if missing:
        raise ValueError(f"manifest missing fields: {', '.join(missing)}")
    related_pages = manifest.get("related_pages")
    if not isinstance(related_pages, list):
        raise ValueError("manifest related_pages must be a list")


def ingest_target(
    paths: IngestPaths,
    target: str,
    domain: str,
    industries: list[str],
    categories: list[str],
    source_title: str | None = None,
    allow_duplicate: bool = False,
    now_iso: str | None = None,
    today: str | None = None,
) -> IngestRecord:
    target_info = normalize_target(target)
    timestamp = now_iso or timestamp_str()
    date = today or today_str()
    original_bytes, original_name, content_type = materialize_original_payload(target_info)
    content_hash = content_hash_for_bytes(original_bytes)
    ingest_id = allocate_ingest_id(paths, target_info.locator_slug, content_hash)
    root_dir = bundle_dir(paths, domain, ingest_id)
    root_dir.mkdir(parents=True, exist_ok=True)

    original_extension = guess_extension_from_content_type(content_type, target_info.file_extension)
    original_basename = Path(original_name).stem if Path(original_name).stem else "original"
    original_filename = f"{original_basename}{original_extension}"
    original_path = root_dir / original_filename
    draft_root = draft_bundle_dir(paths, ingest_id)
    try:
        original_path.write_bytes(original_bytes)

        extraction = extract_content(target_info, original_path, content_type)
        title = infer_title(
            target_info.source_locator,
            source_title or extraction.title_hint,
            target_info.locator_slug,
            target_info.target_type,
        )
        extracted_path = root_dir / "extracted.md"
        atomic_write_text(extracted_path, extraction.extracted_markdown)

        duplicate_matches = detect_duplicate_matches(paths, domain, target_info.source_locator, content_hash, title)
        duplicate_status = duplicate_matches[0]["reason"] if duplicate_matches else "none"
        relation_type = "duplicate" if duplicate_matches else "new"
        related_pages = sorted({str(item["page_path"]) for item in duplicate_matches if item.get("page_path")})
        related_pages.extend(find_related_pages(paths, title, domain))
        related_pages = dedupe_strings(related_pages)

        review_status = determine_review_status(extraction, duplicate_matches, allow_duplicate)
        draft_bundle = write_draft_bundle(
            paths=paths,
            ingest_id=ingest_id,
            domain=domain,
            title=title,
            source_locator=target_info.source_locator,
            target_type=target_info.target_type,
            industries=industries,
            categories=categories,
            content_hash=content_hash,
            relation_type=relation_type,
            review_status=review_status,
            extraction_mode=extraction.extraction_mode,
            extractor_name=extraction.extractor_name,
            extractor_version=extraction.extractor_version,
            related_pages=related_pages,
            original_path=original_path,
            extracted_path=extracted_path,
            extracted_text=extraction.extracted_text,
            duplicate_matches=duplicate_matches,
            timestamp=timestamp,
            date=date,
            allow_duplicate=allow_duplicate,
        )

        manifest = {
            "ingest_id": ingest_id,
            "target_type": target_info.target_type,
            "domain": domain,
            "source_title": title,
            "source_locator": target_info.source_locator,
            "content_hash": content_hash,
            "duplicate_status": duplicate_status,
            "relation_type": relation_type,
            "related_pages": related_pages,
            "review_status": review_status,
            "allow_duplicate": allow_duplicate,
            "content_type": content_type,
            "original_file": rel_repo_path(paths, original_path),
            "extracted_file": rel_repo_path(paths, extracted_path),
            "draft_bundle": rel_repo_path(paths, draft_bundle.root_dir),
            "draft_pages": [rel_repo_path(paths, path) for path in draft_bundle.draft_pages],
            "duplicate_matches": duplicate_matches,
            "notes": extraction.notes,
            "extraction_mode": extraction.extraction_mode,
            "extractor_name": extraction.extractor_name,
            "extractor_version": extraction.extractor_version,
            "extraction_quality": "weak" if extraction.weak_text else "strong",
            "created_at": timestamp,
            "updated_at": timestamp,
        }
        atomic_write_json(root_dir / "manifest.json", manifest)
    except Exception:
        cleanup_partial_ingest(root_dir, draft_root)
        raise
    return load_ingest_record(paths, ingest_id)


def cleanup_partial_ingest(root_dir: Path, draft_root: Path) -> None:
    shutil.rmtree(root_dir, ignore_errors=True)
    shutil.rmtree(draft_root, ignore_errors=True)


def render_manifest_json(payload: dict[str, object]) -> str:
    return json.dumps(payload, ensure_ascii=False, indent=2) + "\n"


def materialize_original_payload(target: IngestTarget) -> tuple[bytes, str, str]:
    if target.target_type == "file":
        path = Path(target.source_locator)
        suffix = path.suffix.lower()
        content_type = "application/octet-stream"
        if suffix in {".md", ".markdown"}:
            content_type = "text/markdown"
        elif suffix in {".txt", ".rtf"}:
            content_type = "text/plain"
        elif suffix in {".html", ".htm"}:
            content_type = "text/html"
        elif suffix == ".pdf":
            content_type = "application/pdf"
        return path.read_bytes(), path.name, content_type

    request = urllib.request.Request(
        target.source_locator,
        headers={"User-Agent": "knowledge-base-ingest/1.0"},
    )
    with urllib.request.urlopen(request, timeout=20) as response:
        payload = response.read()
        content_type = response.headers.get("Content-Type", "application/octet-stream")
    filename = target.filename_hint
    return payload, filename, content_type


def extract_content(target: IngestTarget, original_path: Path, content_type: str) -> ExtractionResult:
    suffix = original_path.suffix.lower()
    if target.target_type == "url" and suffix not in SUPPORTED_FILE_EXTENSIONS:
        suffix = guess_extension_from_content_type(content_type, suffix)
        original_path = original_path.with_suffix(suffix)

    if suffix not in SUPPORTED_FILE_EXTENSIONS:
        raise ValueError(f"unsupported ingest target type: {suffix or 'unknown'}")

    notes: list[str] = []
    extraction_mode = "markitdown-local"
    adapter = MarkItDownOfflineAdapter()
    try:
        converted = adapter.convert_file(original_path.resolve())
    except Exception as exc:
        raise ValueError(f"local markitdown conversion failed for {original_path.name}: {exc}") from exc

    extracted_markdown_body = converted.markdown_content.strip()
    title_hint = markdown_title_hint(extracted_markdown_body)
    extracted_text = markdown_to_text(extracted_markdown_body)
    weak_text = text_is_weak(extracted_text)
    needs_browser_capture = target.target_type == "url" and weak_text
    if needs_browser_capture:
        notes.append("Local markitdown conversion produced weak page content; browser capture is recommended.")
    elif weak_text:
        notes.append("Local markitdown conversion is weak; keep this ingest in source-only review mode.")

    if not extracted_text.strip():
        extracted_text = ""
    return ExtractionResult(
        extracted_text=extracted_text,
        extracted_markdown=render_extracted_markdown(
            source_locator=target.source_locator,
            title_hint=title_hint,
            extraction_mode=extraction_mode,
            extractor_name=converted.extractor_name,
            extractor_version=converted.extractor_version,
            extracted_markdown=extracted_markdown_body,
            notes=notes,
        ),
        extraction_mode=extraction_mode,
        extractor_name=converted.extractor_name,
        extractor_version=converted.extractor_version,
        title_hint=title_hint,
        notes=notes,
        needs_browser_capture=needs_browser_capture,
        weak_text=weak_text,
    )


def markdown_title_hint(markdown: str) -> str:
    for raw_line in markdown.splitlines():
        line = raw_line.strip()
        if not line:
            continue
        if line.startswith("#"):
            line = re.sub(r"^#{1,6}\s*", "", line)
        line = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", line)
        line = line.strip(" -*_`>~")
        if len(line) >= 4:
            return line
    return ""


def markdown_to_text(markdown: str) -> str:
    text = markdown.replace("\r\n", "\n")
    text = re.sub(r"!\[[^\]]*\]\([^)]+\)", " ", text)
    text = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", text)
    text = re.sub(r"^#{1,6}\s*", "", text, flags=re.MULTILINE)
    text = re.sub(r"^>\s*", "", text, flags=re.MULTILINE)
    text = re.sub(r"[*_`~]+", " ", text)
    text = html.unescape(text)
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def decode_text_bytes(payload: bytes) -> str:
    for encoding in ("utf-8", "utf-16", "gb18030", "latin-1"):
        try:
            return payload.decode(encoding)
        except UnicodeDecodeError:
            continue
    return payload.decode("utf-8", errors="ignore")


def extract_html_text(payload: bytes) -> tuple[str, str]:
    raw_html = decode_text_bytes(payload)
    extractor = HTMLTextExtractor()
    extractor.feed(raw_html)
    title = re.sub(r"\s+", " ", " ".join(extractor.title_parts)).strip()
    text = re.sub(r"\n{3,}", "\n\n", "\n".join(extractor.parts))
    text = html.unescape(text)
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n[ \t]+", "\n", text)
    return title, text.strip()


def extract_rtf_text(text: str) -> str:
    compact = re.sub(r"\\'[0-9a-fA-F]{2}", " ", text)
    compact = re.sub(r"\\[a-zA-Z]+-?\d* ?", " ", compact)
    compact = compact.replace("{", " ").replace("}", " ")
    compact = re.sub(r"\s+", " ", compact)
    return compact.strip()


def extract_via_textutil(path: Path) -> str | None:
    if shutil.which("textutil") is None:
        return None
    process = subprocess.run(
        ["textutil", "-convert", "txt", "-stdout", str(path)],
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="ignore",
        check=False,
    )
    if process.returncode != 0:
        return None
    return process.stdout.strip()


def extract_docx_text(path: Path) -> str:
    try:
        import zipfile

        with zipfile.ZipFile(path) as archive:
            xml_text = archive.read("word/document.xml").decode("utf-8", errors="ignore")
    except Exception:
        return ""
    return xml_to_text(xml_text)


def extract_odt_text(path: Path) -> str:
    try:
        import zipfile

        with zipfile.ZipFile(path) as archive:
            xml_text = archive.read("content.xml").decode("utf-8", errors="ignore")
    except Exception:
        return ""
    return xml_to_text(xml_text)


def xml_to_text(xml_text: str) -> str:
    compact = re.sub(r"<text:line-break[^>]*/>", "\n", xml_text)
    compact = re.sub(r"</(w:p|text:p|text:h)>", "\n", compact)
    compact = re.sub(r"<[^>]+>", " ", compact)
    compact = html.unescape(compact)
    compact = re.sub(r"[ \t]+", " ", compact)
    compact = re.sub(r"\n{3,}", "\n\n", compact)
    return compact.strip()


def extract_office_text(path: Path) -> str:
    suffix = path.suffix.lower()
    text = extract_via_textutil(path)
    if text:
        return text
    if suffix == ".docx":
        return extract_docx_text(path)
    if suffix == ".odt":
        return extract_odt_text(path)
    return ""


def extract_pdf_text(path: Path) -> str:
    if shutil.which("pdftotext") is not None:
        process = subprocess.run(
            ["pdftotext", str(path), "-"],
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="ignore",
            check=False,
        )
        if process.returncode == 0 and process.stdout.strip():
            return process.stdout.strip()
    if shutil.which("mdls") is not None:
        process = subprocess.run(
            ["mdls", "-name", "kMDItemTextContent", "-raw", str(path)],
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="ignore",
            check=False,
        )
        if process.returncode == 0:
            output = process.stdout.strip()
            if output and output != "(null)":
                return output
    return ""


def extract_image_text(path: Path) -> str:
    if shutil.which("tesseract") is None:
        return ""
    process = subprocess.run(
        ["tesseract", str(path), "stdout"],
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="ignore",
        check=False,
    )
    if process.returncode != 0:
        return ""
    return process.stdout.strip()


def text_is_weak(text: str) -> bool:
    compact = re.sub(r"\s+", " ", text).strip()
    if not compact:
        return True
    if len(compact) < 120:
        return True
    if len(compact.split()) < 20 and len(compact) < 240:
        return True
    return False


def render_extracted_markdown(
    source_locator: str,
    title_hint: str,
    extraction_mode: str,
    extractor_name: str,
    extractor_version: str,
    extracted_markdown: str,
    notes: list[str],
) -> str:
    lines = [
        "# Extracted Content",
        "",
        "## Metadata",
        "",
        f"- Source locator: `{source_locator}`",
        f"- Title hint: `{title_hint or 'n/a'}`",
        f"- Extraction mode: `{extraction_mode}`",
        f"- Extractor: `{extractor_name}@{extractor_version}`",
    ]
    if notes:
        lines.append("- Notes:")
        lines.extend(f"  - {item}" for item in notes)
    lines.extend(["", "## Markdown", ""])
    if extracted_markdown.strip():
        lines.append(extracted_markdown.strip())
    else:
        lines.append("_No extracted markdown available._")
    return "\n".join(lines).rstrip() + "\n"


def determine_review_status(
    extraction: ExtractionResult,
    duplicate_matches: list[dict[str, object]],
    allow_duplicate: bool,
) -> str:
    if duplicate_matches and not allow_duplicate:
        return "blocked_duplicate"
    if extraction.needs_browser_capture:
        return "needs_browser_capture"
    return "ready_for_review"


def find_manifest_matches(paths: IngestPaths, domain: str, source_locator: str, content_hash: str) -> list[dict[str, object]]:
    matches: list[dict[str, object]] = []
    for path in sorted((paths.raw_root / "domains" / domain / "ingest").glob("*/manifest.json")):
        try:
            manifest = load_manifest(path)
        except Exception:
            continue
        if str(manifest.get("content_hash")) == content_hash:
            matches.append(
                {
                    "reason": "content_hash",
                    "manifest_path": rel_repo_path(paths, path),
                    "ingest_id": manifest.get("ingest_id"),
                    "page_path": first_draft_or_applied_page(manifest),
                }
            )
            continue
        if normalize_locator(str(manifest.get("source_locator") or "")) == normalize_locator(source_locator):
            matches.append(
                {
                    "reason": "source_locator",
                    "manifest_path": rel_repo_path(paths, path),
                    "ingest_id": manifest.get("ingest_id"),
                    "page_path": first_draft_or_applied_page(manifest),
                }
            )
    return matches


def first_draft_or_applied_page(manifest: dict[str, object]) -> str | None:
    draft_pages = manifest.get("draft_pages")
    if isinstance(draft_pages, list) and draft_pages:
        return str(draft_pages[0])
    applied_pages = manifest.get("applied_pages")
    if isinstance(applied_pages, list) and applied_pages:
        return str(applied_pages[0])
    return None


def normalize_locator(locator: str) -> str:
    if not locator:
        return ""
    parsed = urllib.parse.urlsplit(locator)
    if parsed.scheme in {"http", "https"} and parsed.netloc:
        return normalize_url(locator)
    return str(Path(locator).expanduser().resolve())


def detect_duplicate_matches(
    paths: IngestPaths,
    domain: str,
    source_locator: str,
    content_hash: str,
    title: str,
) -> list[dict[str, object]]:
    matches = find_manifest_matches(paths, domain, source_locator, content_hash)
    title_slug = kb_core.slugify(title)
    for source_path in sorted(paths.source_dir.glob("*.md")):
        page = kb_core.load_page(repo_paths(paths), source_path)
        if kb_core.normalize_tag_value(page.meta.get("domain")) != kb_core.normalize_tag_value(domain):
            continue
        page_title_slug = kb_core.slugify(str(page.meta.get("title") or source_path.stem))
        if title_slug and page_title_slug == title_slug:
            matches.append(
                {
                    "reason": "title_match",
                    "manifest_path": "",
                    "ingest_id": None,
                    "page_path": rel_repo_path(paths, source_path),
                }
            )
    seen: set[tuple[str, str, str]] = set()
    deduped: list[dict[str, object]] = []
    for item in matches:
        key = (
            str(item.get("reason") or ""),
            str(item.get("manifest_path") or ""),
            str(item.get("page_path") or ""),
        )
        if key in seen:
            continue
        seen.add(key)
        deduped.append(item)
    return deduped


def find_related_pages(paths: IngestPaths, title: str, domain: str) -> list[str]:
    terms = kb_core.query_terms_from_parts([title])
    if not terms:
        return []
    results = kb_core.query_pages(
        repo_paths(paths),
        terms=terms,
        phrase=kb_core.normalize_search_text(title),
        kinds={"source", "concept", "entity", "synthesis", "domain"},
        limit=4,
        filters=kb_core.QueryFilters(
            domains={kb_core.normalize_tag_value(domain)},
            industries=set(),
            categories=set(),
        ),
        dedupe=True,
    )
    return [rel_repo_path(paths, item.path) for item in results]


def canonical_source_destination(paths: IngestPaths, ingest_id: str, title: str) -> Path:
    base_slug = kb_core.slugify(title) or "source"
    destination = paths.source_dir / f"source-{base_slug}.md"
    if not destination.exists():
        return destination
    return paths.source_dir / f"source-{base_slug}-{ingest_id[-8:]}.md"


def source_refs_for_destination(paths: IngestPaths, destination: Path, references: Iterable[Path]) -> list[str]:
    values: list[str] = []
    for ref_path in references:
        repo_ref = rel_repo_path(paths, ref_path)
        values.append(kb_core.normalize_reference_for_page(repo_paths(paths), destination, repo_ref))
    return dedupe_strings(values)


def related_refs_for_destination(paths: IngestPaths, destination: Path, references: Iterable[str]) -> list[str]:
    values: list[str] = []
    for ref in references:
        values.append(kb_core.normalize_reference_for_page(repo_paths(paths), destination, ref))
    return dedupe_strings(values)


def render_source_draft(
    paths: IngestPaths,
    destination: Path,
    title: str,
    domain: str,
    industries: list[str],
    categories: list[str],
    source_locator: str,
    target_type: str,
    content_hash: str,
    relation_type: str,
    source_refs: list[str],
    related_refs: list[str],
    extracted_text: str,
    date: str,
) -> str:
    preview_lines = summarize_extracted_text(extracted_text, limit=3)
    meta = {
        "title": title,
        "type": "source",
        "status": "draft",
        "created_at": date,
        "updated_at": date,
        "source_refs": source_refs,
        "related": related_refs,
        "domain": domain,
        "industries": industries,
        "categories": categories,
    }
    body_lines = [
        f"# {title}",
        "",
        "## Source Snapshot",
        "",
        f"- Source kind: `{target_type}`",
        f"- Source locator: `{source_locator}`",
        f"- Content hash: `{content_hash[:12]}`",
        f"- Draft relation type: `{relation_type}`",
        "",
        "## Why It Matters",
        "",
        "- `TODO`",
        "",
        "## Key Claims",
        "",
    ]
    if preview_lines:
        body_lines.extend(f"- {item}" for item in preview_lines)
    else:
        body_lines.append("- `TODO`")
    body_lines.extend(["", "## Related Pages", ""])
    if related_refs:
        body_lines.extend(f"- {item}" for item in related_refs)
    else:
        body_lines.append("- `TODO`")
    return kb_core.render_page(meta, "\n".join(body_lines))


def summarize_extracted_text(text: str, limit: int) -> list[str]:
    cleaned: list[str] = []
    for raw_line in text.splitlines():
        compact = re.sub(r"\s+", " ", raw_line).strip()
        if not compact:
            continue
        compact = compact.lstrip("- ").strip()
        if len(compact) < 24:
            continue
        cleaned.append(compact)
        if len(cleaned) >= limit * 3:
            break
    sentences: list[str] = []
    for item in cleaned:
        for candidate in re.split(r"(?<=[.!?。！？])\s+", item):
            compact = candidate.strip().strip(" -")
            if len(compact) < 24:
                continue
            sentences.append(compact)
            if len(sentences) >= limit:
                return dedupe_strings(sentences)
    return dedupe_strings(cleaned[:limit])


def render_review_summary(
    ingest_id: str,
    title: str,
    source_locator: str,
    relation_type: str,
    review_status: str,
    extraction_mode: str,
    extractor_name: str,
    extractor_version: str,
    duplicate_matches: list[dict[str, object]],
    related_pages: list[str],
    draft_pages: list[str],
) -> str:
    lines = [
        f"# Review Summary: {ingest_id}",
        "",
        "## Overview",
        "",
        f"- Source title: `{title}`",
        f"- Source locator: `{source_locator}`",
        f"- Relation type: `{relation_type}`",
        f"- Review status: `{review_status}`",
        f"- Extraction mode: `{extraction_mode}`",
        f"- Extractor: `{extractor_name}@{extractor_version}`",
        "",
        "## Duplicate Detection",
        "",
    ]
    if duplicate_matches:
        lines.extend(
            f"- `{item['reason']}` -> {item.get('page_path') or item.get('manifest_path') or 'n/a'}"
            for item in duplicate_matches
        )
    else:
        lines.append("- No duplicate matches detected")
    lines.extend(["", "## Draft Pages", ""])
    lines.extend(f"- {item}" for item in draft_pages)
    lines.extend(["", "## Related Pages", ""])
    if related_pages:
        lines.extend(f"- {item}" for item in related_pages)
    else:
        lines.append("- None")
    lines.extend(
        [
            "",
            "## Apply Impact",
            "",
            "- Apply will promote draft pages from `output/ingest-drafts/` into `wiki/`.",
            "- Apply will also refresh `wiki/index.md` and append `wiki/log.md`.",
        ]
    )
    return "\n".join(lines).rstrip() + "\n"


def render_log_entry(
    title: str,
    ingest_id: str,
    draft_pages: list[str],
) -> str:
    lines = [
        "# Log Entry",
        "",
        "- action: ingest",
        f"- summary: accept {Path(draft_pages[0]).stem if draft_pages else ingest_id}",
    ]
    lines.extend(f"- note: Accepted {item}" for item in draft_pages)
    lines.append(f"- note: Applied ingest bundle {ingest_id}")
    return "\n".join(lines).rstrip() + "\n"


def write_draft_bundle(
    paths: IngestPaths,
    ingest_id: str,
    domain: str,
    title: str,
    source_locator: str,
    target_type: str,
    industries: list[str],
    categories: list[str],
    content_hash: str,
    relation_type: str,
    review_status: str,
    extraction_mode: str,
    extractor_name: str,
    extractor_version: str,
    related_pages: list[str],
    original_path: Path,
    extracted_path: Path,
    extracted_text: str,
    duplicate_matches: list[dict[str, object]],
    timestamp: str,
    date: str,
    allow_duplicate: bool,
) -> DraftBundle:
    root_dir = draft_bundle_dir(paths, ingest_id)
    wiki_root = root_dir / "wiki"
    destination = canonical_source_destination(paths, ingest_id, title)
    draft_page_path = wiki_root / destination.relative_to(paths.wiki_root)
    source_refs = source_refs_for_destination(paths, destination, [original_path, extracted_path])
    related_refs = related_refs_for_destination(paths, destination, related_pages)
    draft_content = render_source_draft(
        paths=paths,
        destination=destination,
        title=title,
        domain=domain,
        industries=industries,
        categories=categories,
        source_locator=source_locator,
        target_type=target_type,
        content_hash=content_hash,
        relation_type=relation_type,
        source_refs=source_refs,
        related_refs=related_refs,
        extracted_text=extracted_text,
        date=date,
    )
    atomic_write_text(draft_page_path, draft_content)
    draft_repo_paths = [rel_repo_path(paths, draft_page_path)]
    review_summary_path = root_dir / "review-summary.md"
    log_entry_path = root_dir / "log-entry.md"
    atomic_write_text(
        review_summary_path,
        render_review_summary(
            ingest_id=ingest_id,
            title=title,
            source_locator=source_locator,
            relation_type=relation_type,
            review_status=review_status,
            extraction_mode=extraction_mode,
            extractor_name=extractor_name,
            extractor_version=extractor_version,
            duplicate_matches=duplicate_matches,
            related_pages=related_pages,
            draft_pages=draft_repo_paths,
        ),
    )
    atomic_write_text(log_entry_path, render_log_entry(title, ingest_id, draft_repo_paths))
    return DraftBundle(
        root_dir=root_dir,
        wiki_root=wiki_root,
        review_summary_path=review_summary_path,
        log_entry_path=log_entry_path,
        draft_pages=[draft_page_path],
    )


def path_within(path: Path, root: Path) -> bool:
    try:
        path.resolve().relative_to(root.resolve())
        return True
    except ValueError:
        return False


def registered_domains(paths: IngestPaths) -> set[str]:
    domain_dir = Path(paths.page_layout["domain"]["dir"])
    return {path.stem.removeprefix("domain-") for path in domain_dir.glob("*.md")}


def validate_string_list_field(meta: dict[str, object], key: str, issues: list[str], require_non_empty: bool = False) -> list[str]:
    value = meta.get(key)
    if not isinstance(value, list):
        issues.append(f"{key} must be a string list")
        return []
    cleaned: list[str] = []
    for item in value:
        compact = str(item).strip()
        if not compact:
            issues.append(f"{key} contains an empty value")
            continue
        cleaned.append(compact)
    if require_non_empty and not cleaned:
        issues.append(f"{key} must not be empty")
    return cleaned


def validate_reference_field(
    paths: IngestPaths,
    reference_base: Path,
    draft_type: str,
    manifest_domain: str,
    key: str,
    meta: dict[str, object],
    issues: list[str],
) -> None:
    refs = validate_string_list_field(meta, key, issues, require_non_empty=(key == "source_refs" and draft_type in {"source", "entity", "concept", "synthesis"}))
    if not refs:
        return
    expected_raw_root = paths.raw_root / "domains" / manifest_domain
    for raw_target in refs:
        resolved = kb_core.resolve_repo_reference(reference_base, raw_target)
        if not resolved.exists():
            issues.append(f"{key} broken ref -> {raw_target}")
            continue
        if key == "source_refs":
            if draft_type == "source":
                if not path_within(resolved, paths.raw_root):
                    issues.append(f"{key} should resolve inside raw/ -> {raw_target}")
                elif manifest_domain and not path_within(resolved, expected_raw_root):
                    issues.append(f"{key} should stay inside raw/domains/{manifest_domain}/ -> {raw_target}")
            elif not path_within(resolved, paths.source_dir) and not path_within(resolved, paths.raw_root):
                issues.append(f"{key} should resolve to wiki/sources/ or raw/ -> {raw_target}")
        if resolved == reference_base:
            issues.append(f"{key} should not point to itself -> {raw_target}")


def validate_draft_bundle(paths: IngestPaths, record: IngestRecord) -> list[str]:
    issues: list[str] = []
    if not record.draft_bundle.root_dir.exists():
        issues.append("draft bundle is missing")
        return issues
    if not record.draft_bundle.review_summary_path.exists():
        issues.append("review-summary.md is missing")
    if not record.draft_bundle.log_entry_path.exists():
        issues.append("log-entry.md is missing")
    if not record.draft_bundle.draft_pages:
        issues.append("no draft pages were generated")
    manifest_domain = kb_core.normalize_tag_value(record.manifest.get("domain"))
    if not manifest_domain:
        issues.append("manifest domain must not be empty")
    elif manifest_domain not in registered_domains(paths):
        issues.append(f"manifest domain `{manifest_domain}` is not registered in wiki/domains")
    for draft_path in record.draft_bundle.draft_pages:
        text = draft_path.read_text(encoding="utf-8")
        meta, _, has_frontmatter = kb_core.split_frontmatter(text)
        if not has_frontmatter:
            issues.append(f"{draft_path.name}: missing frontmatter")
            continue
        missing = sorted(REQUIRED_DRAFT_FRONTMATTER_KEYS - set(meta))
        if missing:
            issues.append(f"{draft_path.name}: missing frontmatter keys {', '.join(missing)}")
        if str(meta.get("status") or "") != "draft":
            issues.append(f"{draft_path.name}: status must remain draft before apply")
        draft_type = str(meta.get("type") or "").strip()
        if draft_type not in paths.page_layout:
            issues.append(f"{draft_path.name}: unsupported draft type `{draft_type or 'missing'}`")
            continue
        relative = draft_path.relative_to(record.draft_bundle.wiki_root)
        canonical_destination = paths.wiki_root / relative
        expected_dir = Path(paths.page_layout[draft_type]["dir"]).name
        if not relative.parts or relative.parts[0] != expected_dir:
            issues.append(f"{draft_path.name}: draft path does not match type `{draft_type}`")
        draft_domain = kb_core.normalize_tag_value(meta.get("domain"))
        if not draft_domain:
            issues.append(f"{draft_path.name}: missing or invalid `domain`")
        elif draft_domain != manifest_domain:
            issues.append(f"{draft_path.name}: draft domain `{draft_domain}` does not match manifest domain `{manifest_domain}`")
        elif draft_domain not in registered_domains(paths):
            issues.append(f"{draft_path.name}: domain `{draft_domain}` is not registered in wiki/domains")
        validate_string_list_field(meta, "industries", issues, require_non_empty=True)
        validate_string_list_field(meta, "categories", issues, require_non_empty=True)
        validate_reference_field(paths, canonical_destination, draft_type, manifest_domain, "source_refs", meta, issues)
        validate_reference_field(paths, canonical_destination, draft_type, manifest_domain, "related", meta, issues)
    return issues


def activate_draft_page(text: str, date: str) -> str:
    meta, body, has_frontmatter = kb_core.split_frontmatter(text)
    if not has_frontmatter:
        raise ValueError("draft page is missing frontmatter")
    meta["status"] = "active"
    meta["updated_at"] = date
    return kb_core.render_page(meta, body)


def build_apply_plan(
    paths: IngestPaths,
    ingest_id: str,
    today: str | None = None,
    applied_at: str | None = None,
) -> ApplyPlan:
    record = load_ingest_record(paths, ingest_id)
    status = str(record.manifest.get("review_status") or "")
    if status != "ready_for_review":
        raise ValueError(f"only ready_for_review ingests can be applied (current: {status})")
    issues = validate_draft_bundle(paths, record)
    if issues:
        raise ValueError("; ".join(issues))

    date = today or today_str()
    rendered_pages: list[tuple[Path, str]] = []
    for draft_path in record.draft_bundle.draft_pages:
        relative = draft_path.relative_to(record.draft_bundle.wiki_root)
        destination = paths.wiki_root / relative
        if destination.exists():
            raise ValueError(f"canonical destination already exists: {rel_repo_path(paths, destination)}")
        rendered_pages.append((destination, activate_draft_page(draft_path.read_text(encoding="utf-8"), date)))

    updated_manifest = dict(record.manifest)
    updated_manifest["review_status"] = "accepted"
    updated_manifest["applied_at"] = applied_at or timestamp_str()
    updated_manifest["updated_at"] = updated_manifest["applied_at"]
    updated_manifest["applied_pages"] = [rel_repo_path(paths, destination) for destination, _ in rendered_pages]
    return ApplyPlan(record=record, rendered_pages=rendered_pages, updated_manifest=updated_manifest)


def transactionally_write_text_files(updates: list[tuple[Path, str]]) -> None:
    snapshots: list[tuple[Path, str | None]] = []
    for path, _ in updates:
        original = path.read_text(encoding="utf-8") if path.exists() else None
        snapshots.append((path, original))
    try:
        for path, content in updates:
            atomic_write_text(path, content)
    except Exception:
        for path, original in reversed(snapshots):
            if original is None:
                if path.exists():
                    path.unlink()
                continue
            atomic_write_text(path, original)
        raise


def apply_ingest_record(paths: IngestPaths, ingest_id: str, today: str | None = None) -> ApplyResult:
    plan = build_apply_plan(paths, ingest_id, today=today)
    updates = list(plan.rendered_pages)
    updates.append((plan.record.manifest_path, render_manifest_json(plan.updated_manifest)))
    transactionally_write_text_files(updates)
    return ApplyResult(record=load_ingest_record(paths, ingest_id), applied_paths=plan.applied_paths)


def reject_ingest_record(paths: IngestPaths, ingest_id: str) -> IngestRecord:
    record = load_ingest_record(paths, ingest_id)
    status = str(record.manifest.get("review_status") or "")
    if status not in {"ready_for_review", "blocked_duplicate", "needs_browser_capture"}:
        raise ValueError(f"only reviewable ingests can be rejected (current: {status or 'unknown'})")
    updated_manifest = dict(record.manifest)
    updated_manifest["review_status"] = "rejected"
    updated_manifest["updated_at"] = timestamp_str()
    updated_manifest["rejected_at"] = updated_manifest["updated_at"]
    atomic_write_json(record.manifest_path, updated_manifest)
    return load_ingest_record(paths, ingest_id)


def parse_log_entry(path: Path) -> tuple[str, str, list[str]]:
    action = ""
    summary = ""
    notes: list[str] = []
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        stripped = raw_line.strip()
        if stripped.startswith("- action:"):
            action = stripped.split(":", 1)[1].strip()
        elif stripped.startswith("- summary:"):
            summary = stripped.split(":", 1)[1].strip()
        elif stripped.startswith("- note:"):
            notes.append(stripped.split(":", 1)[1].strip())
    if not action or not summary or not notes:
        raise ValueError(f"invalid log entry bundle: {path}")
    return action, summary, notes


def rel_repo_path(paths: IngestPaths, path: Path) -> str:
    return path.relative_to(paths.repo_root).as_posix()


def dedupe_strings(values: Iterable[str]) -> list[str]:
    deduped: list[str] = []
    seen: set[str] = set()
    for value in values:
        compact = str(value).strip()
        if not compact or compact in seen:
            continue
        seen.add(compact)
        deduped.append(compact)
    return deduped
