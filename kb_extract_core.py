from __future__ import annotations

import hashlib
import json
import re
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path

from kb_markitdown import MarkItDownOfflineAdapter


STATUSES = {"requested", "extracting", "succeeded", "low_confidence", "failed"}


@dataclass(frozen=True)
class ExtractPaths:
    repo_root: Path
    artifacts_root: Path


@dataclass(frozen=True)
class ExtractArtifacts:
    request_id: str
    request_path: Path
    result_path: Path
    content_path: Path


@dataclass(frozen=True)
class ExtractOutcome:
    request_id: str
    extract_status: str
    extract_error: str | None
    extractor_name: str
    extractor_version: str
    request_path: Path
    result_path: Path
    content_path: Path


def now_iso() -> str:
    return datetime.now().astimezone().isoformat(timespec="seconds")


def build_extract_paths(repo_root: Path) -> ExtractPaths:
    return ExtractPaths(
        repo_root=repo_root,
        artifacts_root=repo_root / "artifacts" / "extract",
    )


def allocate_request_id(source_path: str) -> str:
    normalized = source_path.strip()
    slug = slugify(Path(normalized).name or "source")
    digest = hashlib.sha1(normalized.encode("utf-8")).hexdigest()[:10]
    return f"extract-{slug}-{digest}"


def artifact_paths(paths: ExtractPaths, request_id: str) -> ExtractArtifacts:
    root = paths.artifacts_root / request_id
    return ExtractArtifacts(
        request_id=request_id,
        request_path=root / "request.json",
        result_path=root / "result.json",
        content_path=root / "content.md",
    )


def slugify(text: str) -> str:
    compact = re.sub(r"[^a-zA-Z0-9]+", "-", text.strip().lower())
    compact = re.sub(r"-{2,}", "-", compact).strip("-")
    return compact or "item"


def atomic_write_text(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_name(f".{path.name}.tmp")
    tmp.write_text(content, encoding="utf-8")
    tmp.replace(path)


def atomic_write_json(path: Path, payload: dict[str, object]) -> None:
    atomic_write_text(path, json.dumps(payload, ensure_ascii=False, indent=2) + "\n")


def execute_extract(
    paths: ExtractPaths,
    *,
    source_path: str,
    request_id: str | None = None,
    requested_at: str | None = None,
) -> ExtractOutcome:
    normalized_path = str(Path(source_path).expanduser())
    request_key = request_id or allocate_request_id(normalized_path)
    artifacts = artifact_paths(paths, request_key)
    requested_time = requested_at or now_iso()

    request_payload = {
        "request_id": request_key,
        "source_type": "local_file",
        "source_path": normalized_path,
        "requested_at": requested_time,
    }
    atomic_write_json(artifacts.request_path, request_payload)

    extracting_payload = {
        "request_id": request_key,
        "extractor_name": "markitdown",
        "extractor_version": "unknown",
        "extract_status": "extracting",
        "extract_error": None,
        "extracted_at": now_iso(),
    }
    atomic_write_json(artifacts.result_path, extracting_payload)

    path_obj = Path(normalized_path).expanduser()
    if not path_obj.exists():
        return finalize_failed(
            artifacts,
            request_id=request_key,
            error=f"source path not found: {path_obj}",
        )
    if not path_obj.is_file():
        return finalize_failed(
            artifacts,
            request_id=request_key,
            error=f"source path is not a file: {path_obj}",
        )

    adapter = MarkItDownOfflineAdapter()
    try:
        converted = adapter.convert_file(path_obj.resolve())
    except Exception as exc:
        return finalize_failed(artifacts, request_id=request_key, error=str(exc))

    markdown = converted.markdown_content or ""
    confidence_low = is_low_confidence(markdown)
    status = "low_confidence" if confidence_low else "succeeded"
    error_text = "extracted markdown is empty or near-empty" if confidence_low else None

    atomic_write_text(artifacts.content_path, markdown)
    result_payload = {
        "request_id": request_key,
        "extractor_name": converted.extractor_name,
        "extractor_version": converted.extractor_version,
        "extract_status": status,
        "extract_error": error_text,
        "extracted_at": now_iso(),
    }
    atomic_write_json(artifacts.result_path, result_payload)
    return ExtractOutcome(
        request_id=request_key,
        extract_status=status,
        extract_error=error_text,
        extractor_name=converted.extractor_name,
        extractor_version=converted.extractor_version,
        request_path=artifacts.request_path,
        result_path=artifacts.result_path,
        content_path=artifacts.content_path,
    )


def finalize_failed(artifacts: ExtractArtifacts, *, request_id: str, error: str) -> ExtractOutcome:
    atomic_write_text(artifacts.content_path, "")
    payload = {
        "request_id": request_id,
        "extractor_name": "markitdown",
        "extractor_version": "unknown",
        "extract_status": "failed",
        "extract_error": error,
        "extracted_at": now_iso(),
    }
    atomic_write_json(artifacts.result_path, payload)
    return ExtractOutcome(
        request_id=request_id,
        extract_status="failed",
        extract_error=error,
        extractor_name="markitdown",
        extractor_version="unknown",
        request_path=artifacts.request_path,
        result_path=artifacts.result_path,
        content_path=artifacts.content_path,
    )


def is_low_confidence(markdown: str) -> bool:
    stripped = markdown.strip()
    if not stripped:
        return True
    plain = re.sub(r"[\s#>*`_\-\[\]\(\)\|]+", " ", stripped)
    plain = re.sub(r"\s+", " ", plain).strip()
    if len(plain) < 40:
        return True
    words = [part for part in plain.split(" ") if part]
    return len(words) < 8

