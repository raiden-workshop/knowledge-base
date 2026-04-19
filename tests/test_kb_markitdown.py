from __future__ import annotations

import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest import mock

import kb_markitdown


class KBMarkItDownTests(unittest.TestCase):
    def setUp(self):
        self.tempdir = tempfile.TemporaryDirectory()
        self.root = Path(self.tempdir.name)
        self.sample_pdf = self.root / "sample.pdf"
        self.sample_pdf.write_text("%PDF-1.4 fake payload", encoding="utf-8")

    def tearDown(self):
        self.tempdir.cleanup()

    def test_weak_pdf_uses_local_ocr_when_available_and_improves_output(self):
        def fake_convert(path: Path):
            if path.name == "ocr-output.pdf":
                return kb_markitdown.MarkItDownResult(
                    markdown_content=(
                        "# OCR Output\n\n"
                        "This OCR enriched markdown body is intentionally long enough to beat the weak-text gate."
                    ),
                    extractor_name="markitdown",
                    extractor_version="test",
                )
            return kb_markitdown.MarkItDownResult(
                markdown_content="tiny",
                extractor_name="markitdown",
                extractor_version="test",
            )

        def fake_subprocess_run(args, **kwargs):
            output_path = Path(args[-1])
            output_path.write_text("%PDF-1.4 ocr output", encoding="utf-8")
            return SimpleNamespace(returncode=0, stdout="", stderr="")

        with (
            mock.patch.object(kb_markitdown, "_convert_with_markitdown", side_effect=fake_convert),
            mock.patch.object(kb_markitdown.shutil, "which", side_effect=lambda name: "/opt/homebrew/bin/ocrmypdf" if name == "ocrmypdf" else None),
            mock.patch.object(kb_markitdown.subprocess, "run", side_effect=fake_subprocess_run),
        ):
            result = kb_markitdown.MarkItDownOfflineAdapter().convert_file(self.sample_pdf)

        self.assertEqual(result.extraction_mode, "markitdown-local+ocrmypdf")
        self.assertEqual(result.ocr_applied, True)
        self.assertEqual(result.ocr_engine, "ocrmypdf+tesseract")
        self.assertEqual(result.ocr_languages, "chi_sim+eng")
        self.assertIn("OCR enriched", result.markdown_content)
        self.assertTrue(any("fallback applied" in note for note in result.notes))

    def test_weak_pdf_keeps_original_output_when_local_ocr_is_unavailable(self):
        weak_result = kb_markitdown.MarkItDownResult(
            markdown_content="tiny",
            extractor_name="markitdown",
            extractor_version="test",
        )

        with (
            mock.patch.object(kb_markitdown, "_convert_with_markitdown", return_value=weak_result),
            mock.patch.object(kb_markitdown.shutil, "which", return_value=None),
        ):
            result = kb_markitdown.MarkItDownOfflineAdapter().convert_file(self.sample_pdf)

        self.assertEqual(result.extraction_mode, "markitdown-local")
        self.assertEqual(result.ocr_applied, False)
        self.assertTrue(any("ocrmypdf" in note for note in result.notes))

    def test_strong_pdf_skips_local_ocr_attempt(self):
        strong_result = kb_markitdown.MarkItDownResult(
            markdown_content=(
                "# Strong\n\n"
                "This markdown body is already strong enough that the local OCR fallback should never run."
            ),
            extractor_name="markitdown",
            extractor_version="test",
        )

        with (
            mock.patch.object(kb_markitdown, "_convert_with_markitdown", return_value=strong_result),
            mock.patch.object(kb_markitdown.shutil, "which", side_effect=AssertionError("OCR lookup should not happen")),
        ):
            result = kb_markitdown.MarkItDownOfflineAdapter().convert_file(self.sample_pdf)

        self.assertEqual(result.extraction_mode, "markitdown-local")
        self.assertEqual(result.ocr_applied, False)
        self.assertEqual(result.notes, ())


if __name__ == "__main__":
    unittest.main()
