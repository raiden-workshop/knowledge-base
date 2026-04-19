from __future__ import annotations

import shutil
import subprocess
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class MarkItDownResult:
    markdown_content: str
    extractor_name: str
    extractor_version: str


class MarkItDownOfflineAdapter:
    def __init__(
        self,
        *,
        llm_client: object | None = None,
        llm_model: str | None = None,
        enable_ocr: bool = False,
        use_azure_document_intelligence: bool = False,
    ) -> None:
        if llm_client is not None:
            raise ValueError("offline extractor does not allow `llm_client`")
        if llm_model:
            raise ValueError("offline extractor does not allow `llm_model`")
        if enable_ocr:
            raise ValueError("offline extractor does not allow OCR")
        if use_azure_document_intelligence:
            raise ValueError("offline extractor does not allow Azure Document Intelligence")

    def convert_file(self, source_path: Path) -> MarkItDownResult:
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

