from __future__ import annotations

import re
import shutil
import subprocess
import tempfile
from dataclasses import dataclass, replace
from pathlib import Path


DEFAULT_LOCAL_OCR_LANGUAGES = "chi_sim+eng"


@dataclass(frozen=True)
class MarkItDownResult:
    markdown_content: str
    extractor_name: str
    extractor_version: str
    extraction_mode: str = "markitdown-local"
    ocr_applied: bool = False
    ocr_engine: str | None = None
    ocr_languages: str | None = None
    notes: tuple[str, ...] = ()


class MarkItDownOfflineAdapter:
    def __init__(
        self,
        *,
        llm_client: object | None = None,
        llm_model: str | None = None,
        enable_ocr: bool = False,
        use_azure_document_intelligence: bool = False,
        enable_local_pdf_ocr: bool = True,
        ocr_languages: str = DEFAULT_LOCAL_OCR_LANGUAGES,
    ) -> None:
        if llm_client is not None:
            raise ValueError("offline extractor does not allow `llm_client`")
        if llm_model:
            raise ValueError("offline extractor does not allow `llm_model`")
        if enable_ocr:
            raise ValueError("offline extractor does not allow OCR")
        if use_azure_document_intelligence:
            raise ValueError("offline extractor does not allow Azure Document Intelligence")
        self.enable_local_pdf_ocr = enable_local_pdf_ocr
        normalized_ocr_languages = (ocr_languages or DEFAULT_LOCAL_OCR_LANGUAGES).strip()
        self.ocr_languages = normalized_ocr_languages or DEFAULT_LOCAL_OCR_LANGUAGES

    def convert_file(self, source_path: Path) -> MarkItDownResult:
        converted = _convert_with_markitdown(source_path)
        if not self.enable_local_pdf_ocr:
            return converted
        if source_path.suffix.lower() != ".pdf":
            return converted
        if not _markdown_is_near_empty(converted.markdown_content):
            return converted

        ocr_converted, ocr_note = _convert_with_local_pdf_ocr(source_path, self.ocr_languages)
        if ocr_converted is None:
            return replace(converted, notes=(*converted.notes, ocr_note))

        if _markdown_quality_score(ocr_converted.markdown_content) <= _markdown_quality_score(converted.markdown_content):
            return replace(
                converted,
                notes=(
                    *converted.notes,
                    "Local PDF OCR fallback ran but did not improve weak MarkItDown output.",
                ),
            )
        return ocr_converted


def _convert_with_markitdown(source_path: Path) -> MarkItDownResult:
    package_error: Exception | None = None
    try:
        from markitdown import MarkItDown  # type: ignore

        converter = MarkItDown()
        converted = converter.convert(str(source_path))
        markdown = _coerce_markdown_text(converted)
        version = _markitdown_version_fallback()
        return MarkItDownResult(
            markdown_content=markdown,
            extractor_name="markitdown",
            extractor_version=version,
        )
    except Exception as exc:
        package_error = exc

    if shutil.which("markitdown"):
        process = subprocess.run(
            ["markitdown", str(source_path)],
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="ignore",
            check=False,
        )
        if process.returncode == 0:
            return MarkItDownResult(
                markdown_content=process.stdout,
                extractor_name="markitdown",
                extractor_version="unknown",
            )
        stderr = process.stderr.strip() or process.stdout.strip() or "markitdown command failed"
        raise RuntimeError(stderr)

    if package_error is not None:
        raise RuntimeError(f"markitdown unavailable: {package_error}") from package_error
    raise RuntimeError("markitdown unavailable: package or CLI not found")


def _convert_with_local_pdf_ocr(source_path: Path, ocr_languages: str) -> tuple[MarkItDownResult | None, str]:
    if shutil.which("ocrmypdf") is None:
        return None, "Local PDF OCR fallback unavailable: `ocrmypdf` was not found on PATH."

    with tempfile.TemporaryDirectory(prefix="kb-ocr-") as temp_dir:
        ocr_output_path = Path(temp_dir) / "ocr-output.pdf"
        process = subprocess.run(
            [
                "ocrmypdf",
                "--skip-text",
                "--rotate-pages",
                "--deskew",
                "--output-type",
                "pdf",
                "-l",
                ocr_languages,
                str(source_path),
                str(ocr_output_path),
            ],
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="ignore",
            check=False,
        )
        if process.returncode != 0:
            detail = process.stderr.strip() or process.stdout.strip() or "ocrmypdf command failed"
            return None, f"Local PDF OCR fallback failed: {_compact_error(detail)}"
        if not ocr_output_path.exists():
            return None, "Local PDF OCR fallback failed: `ocrmypdf` did not produce an output PDF."
        try:
            converted = _convert_with_markitdown(ocr_output_path)
        except Exception as exc:
            return None, f"Local PDF OCR fallback failed during MarkItDown conversion: {_compact_error(str(exc))}"
    return (
        replace(
            converted,
            extraction_mode="markitdown-local+ocrmypdf",
            ocr_applied=True,
            ocr_engine="ocrmypdf+tesseract",
            ocr_languages=ocr_languages,
            notes=(*converted.notes, "Local PDF OCR fallback applied before the final MarkItDown conversion."),
        ),
        "",
    )


def _coerce_markdown_text(converted: object) -> str:
    for key in ("text_content", "markdown", "content"):
        value = getattr(converted, key, None)
        if isinstance(value, str) and value.strip():
            return value
    if isinstance(converted, str):
        return converted
    rendered = str(converted)
    return rendered


def _markitdown_version_fallback() -> str:
    try:
        import importlib.metadata

        return importlib.metadata.version("markitdown")
    except Exception:
        return "unknown"


def _markdown_is_near_empty(markdown: str) -> bool:
    plain = _normalize_markdown(markdown)
    if len(plain) < 40:
        return True
    words = [part for part in plain.split(" ") if part]
    return len(words) < 8


def _markdown_quality_score(markdown: str) -> tuple[int, int]:
    plain = _normalize_markdown(markdown)
    return (0 if _markdown_is_near_empty(markdown) else 1, len(plain))


def _normalize_markdown(markdown: str) -> str:
    compact = re.sub(r"[\s#>*`_\-\[\]\(\)\|]+", " ", markdown.strip())
    return re.sub(r"\s+", " ", compact).strip()


def _compact_error(message: str, limit: int = 240) -> str:
    compact = re.sub(r"\s+", " ", message).strip()
    if len(compact) <= limit:
        return compact
    return compact[: limit - 3].rstrip() + "..."
