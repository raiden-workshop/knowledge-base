from __future__ import annotations

import argparse
import contextlib
import importlib.machinery
import importlib.util
import io
import json
import os
import sys
import tempfile
import unittest
from pathlib import Path


SCRIPT_PATH = Path(__file__).resolve().parents[1] / "kb"


def load_module():
    loader = importlib.machinery.SourceFileLoader("kb_extract_module", str(SCRIPT_PATH))
    spec = importlib.util.spec_from_loader(loader.name, loader)
    assert spec is not None
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    loader.exec_module(module)
    return module


def write_text(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


class _FakeAdapterSuccess:
    def convert_file(self, source_path: Path):
        from kb_markitdown import MarkItDownResult

        return MarkItDownResult(
            markdown_content="# Sample\n\nThis extraction has enough text to be high confidence.",
            extractor_name="markitdown",
            extractor_version="test",
        )


class _FakeAdapterLowConfidence:
    def convert_file(self, source_path: Path):
        from kb_markitdown import MarkItDownResult

        return MarkItDownResult(
            markdown_content="tiny",
            extractor_name="markitdown",
            extractor_version="test",
        )


class _FakeAdapterOcrSuccess:
    def convert_file(self, source_path: Path):
        from kb_markitdown import MarkItDownResult

        return MarkItDownResult(
            markdown_content="# OCR Sample\n\nThis OCR extraction has enough text to be treated as strong content in tests.",
            extractor_name="markitdown",
            extractor_version="test",
            extraction_mode="markitdown-local+ocrmypdf",
            ocr_applied=True,
            ocr_engine="ocrmypdf+tesseract",
            ocr_languages="chi_sim+eng",
            notes=("Local PDF OCR fallback applied before the final MarkItDown conversion.",),
        )


class KBExtractTests(unittest.TestCase):
    def setUp(self):
        self.module = load_module()
        self.tempdir = tempfile.TemporaryDirectory()
        self.repo_root = Path(self.tempdir.name).resolve()
        self.module.REPO_ROOT = self.repo_root
        self.module.WIKI_ROOT = self.repo_root / "wiki"
        self.module.RAW_ROOT = self.repo_root / "raw"
        self.module.OUTPUT_ROOT = self.repo_root / "output"
        self.module.INDEX_PATH = self.module.WIKI_ROOT / "index.md"
        self.module.LOG_PATH = self.module.WIKI_ROOT / "log.md"
        self.incoming = self.repo_root / "incoming"
        self.incoming.mkdir(parents=True, exist_ok=True)

    def tearDown(self):
        self.tempdir.cleanup()

    def run_extract(self, source_path: Path | str, *, request_id: str | None = None, as_json: bool = True):
        stdout = io.StringIO()
        with contextlib.redirect_stdout(stdout):
            exit_code = self.module.cmd_extract_offline(
                argparse.Namespace(
                    source_path=str(source_path),
                    request_id=request_id,
                    json=as_json,
                )
            )
        return exit_code, stdout.getvalue().strip()

    def latest_artifact_dir(self) -> Path:
        root = self.repo_root / "artifacts" / "extract"
        entries = sorted(path for path in root.glob("*") if path.is_dir())
        self.assertTrue(entries)
        return entries[-1]

    def test_success_extracts_local_file_and_writes_artifacts(self):
        original_adapter = self.module.kb_extract_core.MarkItDownOfflineAdapter
        self.module.kb_extract_core.MarkItDownOfflineAdapter = _FakeAdapterSuccess
        try:
            source = self.incoming / "sample.txt"
            write_text(source, "raw sample content")
            exit_code, output = self.run_extract(source, as_json=True)
        finally:
            self.module.kb_extract_core.MarkItDownOfflineAdapter = original_adapter

        self.assertEqual(exit_code, 0)
        payload = json.loads(output)
        self.assertEqual(payload["extract_status"], "succeeded")

        artifact_dir = self.latest_artifact_dir()
        self.assertTrue((artifact_dir / "request.json").exists())
        self.assertTrue((artifact_dir / "result.json").exists())
        self.assertTrue((artifact_dir / "content.md").exists())

        request_payload = json.loads((artifact_dir / "request.json").read_text(encoding="utf-8"))
        self.assertEqual(set(request_payload.keys()) >= {"request_id", "source_type", "source_path", "requested_at"}, True)

        result_payload = json.loads((artifact_dir / "result.json").read_text(encoding="utf-8"))
        self.assertEqual(
            set(result_payload.keys())
            >= {
                "request_id",
                "extraction_mode",
                "extractor_name",
                "extractor_version",
                "ocr_applied",
                "ocr_engine",
                "ocr_languages",
                "notes",
                "extract_status",
                "extract_error",
                "extracted_at",
            },
            True,
        )

    def test_missing_path_fails_explicitly(self):
        missing = self.incoming / "does-not-exist.md"
        exit_code, output = self.run_extract(missing, as_json=True)
        payload = json.loads(output)
        self.assertEqual(exit_code, 1)
        self.assertEqual(payload["extract_status"], "failed")
        self.assertIn("not found", payload["extract_error"])

    def test_near_empty_content_marks_low_confidence(self):
        original_adapter = self.module.kb_extract_core.MarkItDownOfflineAdapter
        self.module.kb_extract_core.MarkItDownOfflineAdapter = _FakeAdapterLowConfidence
        try:
            source = self.incoming / "thin.txt"
            write_text(source, "small")
            exit_code, output = self.run_extract(source, as_json=True)
        finally:
            self.module.kb_extract_core.MarkItDownOfflineAdapter = original_adapter

        payload = json.loads(output)
        self.assertEqual(exit_code, 0)
        self.assertEqual(payload["extract_status"], "low_confidence")
        self.assertTrue(payload["extract_error"])

    def test_extract_propagates_local_ocr_metadata(self):
        original_adapter = self.module.kb_extract_core.MarkItDownOfflineAdapter
        self.module.kb_extract_core.MarkItDownOfflineAdapter = _FakeAdapterOcrSuccess
        try:
            source = self.incoming / "ocr.pdf"
            write_text(source, "%PDF-1.4 fake payload")
            exit_code, output = self.run_extract(source, as_json=True)
        finally:
            self.module.kb_extract_core.MarkItDownOfflineAdapter = original_adapter

        self.assertEqual(exit_code, 0)
        payload = json.loads(output)
        self.assertEqual(payload["extraction_mode"], "markitdown-local+ocrmypdf")
        self.assertEqual(payload["ocr_applied"], True)
        self.assertEqual(payload["ocr_engine"], "ocrmypdf+tesseract")
        self.assertEqual(payload["ocr_languages"], "chi_sim+eng")
        self.assertTrue(payload["notes"])

    def test_same_request_id_is_predictable_and_reproducible(self):
        original_adapter = self.module.kb_extract_core.MarkItDownOfflineAdapter
        self.module.kb_extract_core.MarkItDownOfflineAdapter = _FakeAdapterSuccess
        try:
            source = self.incoming / "predictable.txt"
            write_text(source, "predictable")
            first_code, first_output = self.run_extract(source, as_json=True)
            second_code, second_output = self.run_extract(source, as_json=True)
        finally:
            self.module.kb_extract_core.MarkItDownOfflineAdapter = original_adapter

        self.assertEqual(first_code, 0)
        self.assertEqual(second_code, 0)
        first_payload = json.loads(first_output)
        second_payload = json.loads(second_output)
        self.assertEqual(first_payload["request_id"], second_payload["request_id"])

    def test_adapter_rejects_external_api_configuration_by_default(self):
        from kb_markitdown import MarkItDownOfflineAdapter

        with self.assertRaises(ValueError):
            MarkItDownOfflineAdapter(llm_client=object())
        with self.assertRaises(ValueError):
            MarkItDownOfflineAdapter(llm_model="gpt-4o")
        with self.assertRaises(ValueError):
            MarkItDownOfflineAdapter(enable_ocr=True)
        with self.assertRaises(ValueError):
            MarkItDownOfflineAdapter(use_azure_document_intelligence=True)

        original_api = os.environ.pop("OPENAI_API_KEY", None)
        try:
            adapter = MarkItDownOfflineAdapter()
            self.assertIsInstance(adapter, MarkItDownOfflineAdapter)
        finally:
            if original_api is not None:
                os.environ["OPENAI_API_KEY"] = original_api


if __name__ == "__main__":
    unittest.main()
