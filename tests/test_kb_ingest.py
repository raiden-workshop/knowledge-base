from __future__ import annotations

import argparse
import contextlib
import importlib.machinery
import importlib.util
import io
import json
import sys
import tempfile
import unittest
from datetime import datetime, timezone
from pathlib import Path

import kb_core


SCRIPT_PATH = Path(__file__).resolve().parents[1] / "kb"
TEST_DOMAIN = "memory-governance"
TEST_INDUSTRIES = ["ai"]


def load_module():
    loader = importlib.machinery.SourceFileLoader("kb_ingest_module", str(SCRIPT_PATH))
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

        raw_text = source_path.read_text(encoding="utf-8", errors="ignore").strip()
        seed = raw_text or f"Converted content from {source_path.name}."
        markdown = (
            f"# {source_path.stem}\n\n"
            f"{seed}\n\n"
            "This extraction has enough durable governance text to be high confidence in tests.\n"
            "The markdown content is intentionally long enough to avoid weak-content gates.\n"
        )
        return MarkItDownResult(
            markdown_content=markdown,
            extractor_name="markitdown",
            extractor_version="test",
        )


class _FakeAdapterFailure:
    def convert_file(self, source_path: Path):
        raise RuntimeError("markitdown unavailable: package or CLI not found")


class _FakeAdapterWeirdTitle:
    def convert_file(self, source_path: Path):
        from kb_markitdown import MarkItDownResult

        return MarkItDownResult(
            markdown_content="# 2026/3/5 23:15\n\nThis markdown body is long enough to pass confidence gates for title tests.\n",
            extractor_name="markitdown",
            extractor_version="test",
        )


class _FakeAdapterOcrSuccess:
    def convert_file(self, source_path: Path):
        from kb_markitdown import MarkItDownResult

        return MarkItDownResult(
            markdown_content=(
                "# OCR Success\n\n"
                "This OCR-enriched markdown body is intentionally long enough to clear weak-content checks.\n"
                "It represents a scanned PDF that became readable after the local OCR fallback.\n"
            ),
            extractor_name="markitdown",
            extractor_version="test",
            extraction_mode="markitdown-local+ocrmypdf",
            ocr_applied=True,
            ocr_engine="ocrmypdf+tesseract",
            ocr_languages="chi_sim+eng",
            notes=("Local PDF OCR fallback applied before the final MarkItDown conversion.",),
        )


class KBIngestTests(unittest.TestCase):
    def setUp(self):
        self.module = load_module()
        self.tempdir = tempfile.TemporaryDirectory()
        self.repo_root = Path(self.tempdir.name).resolve()
        self.wiki_root = self.repo_root / "wiki"
        self.raw_root = self.repo_root / "raw"
        self.output_root = self.repo_root / "output"
        self.external_root = self.repo_root / "incoming"
        self.wiki_root.mkdir()
        self.raw_root.mkdir()
        self.output_root.mkdir()
        self.external_root.mkdir()

        self.module.REPO_ROOT = self.repo_root
        self.module.WIKI_ROOT = self.wiki_root
        self.module.RAW_ROOT = self.raw_root
        self.module.OUTPUT_ROOT = self.output_root
        self.module.INDEX_PATH = self.wiki_root / "index.md"
        self.module.LOG_PATH = self.wiki_root / "log.md"
        self.module.FOUNDING_DOMAIN = TEST_DOMAIN
        self.module.FOUNDING_INDUSTRIES = list(TEST_INDUSTRIES)
        self.module.DEFAULT_PAGE_CATEGORIES = {
            "source": ["reference"],
            "entity": ["tooling"],
            "concept": ["architecture"],
            "synthesis": ["workflow"],
            "domain": ["governance"],
            "report": ["maintenance"],
        }
        self.module.PAGE_LAYOUT = {
            "source": {
                "dir": self.wiki_root / "sources",
                "prefix": "source-",
                "index_heading": "## Sources",
            },
            "entity": {
                "dir": self.wiki_root / "entities",
                "prefix": "entity-",
                "index_heading": "## Entities",
            },
            "concept": {
                "dir": self.wiki_root / "concepts",
                "prefix": "concept-",
                "index_heading": "## Concepts",
            },
            "synthesis": {
                "dir": self.wiki_root / "syntheses",
                "prefix": "synthesis-",
                "index_heading": "## Syntheses",
            },
            "domain": {
                "dir": self.wiki_root / "domains",
                "prefix": "domain-",
                "index_heading": "## Domains",
            },
            "report": {
                "dir": self.wiki_root / "reports",
                "prefix": "report-",
                "index_heading": "## Reports",
            },
        }
        for spec in self.module.PAGE_LAYOUT.values():
            spec["dir"].mkdir(parents=True, exist_ok=True)

        self.today = self.module.today_str()
        self.seed_workspace()
        self.original_adapter = self.module.kb_ingest_core.MarkItDownOfflineAdapter
        self.module.kb_ingest_core.MarkItDownOfflineAdapter = _FakeAdapterSuccess

    def tearDown(self):
        self.module.kb_ingest_core.MarkItDownOfflineAdapter = self.original_adapter
        self.tempdir.cleanup()

    def seed_workspace(self):
        write_text(
            self.wiki_root / "domains" / "domain-memory-governance.md",
            "\n".join(
                [
                    "---",
                    'title: "Domain: Memory Governance"',
                    "type: domain",
                    "status: active",
                    f"created_at: {self.today}",
                    f"updated_at: {self.today}",
                    "source_refs: []",
                    "related:",
                    "  - ../index.md",
                    "domain: memory-governance",
                    "industries:",
                    "  - ai",
                    "categories:",
                    "  - governance",
                    "---",
                    "",
                    "# Domain: Memory Governance",
                    "",
                    "## Main Entry",
                    "",
                    "- `TODO`",
                    "",
                ]
            )
            + "\n",
        )
        write_text(
            self.module.LOG_PATH,
            "\n".join(
                [
                    "---",
                    'title: "Knowledge Base Log"',
                    "type: report",
                    "status: active",
                    f"created_at: {self.today}",
                    f"updated_at: {self.today}",
                    "source_refs: []",
                    "related:",
                    "  - index",
                    "domain: memory-governance",
                    "industries:",
                    "  - ai",
                    "categories:",
                    "  - maintenance",
                    "---",
                    "",
                    "# Knowledge Base Log",
                    "",
                ]
            )
            + "\n",
        )
        write_text(
            self.module.INDEX_PATH,
            "\n".join(
                [
                    "---",
                    'title: "Wiki Index"',
                    "type: guide",
                    "status: active",
                    f"created_at: {self.today}",
                    f"updated_at: {self.today}",
                    "source_refs: []",
                    "related:",
                    "  - log",
                    "domain: memory-governance",
                    "industries:",
                    "  - ai",
                    "categories:",
                    "  - navigation",
                    "---",
                    "",
                    "# Wiki Index",
                    "",
                    "## Overview",
                    "",
                    "- [log](./log.md)",
                    "",
                    "## Domains",
                    "",
                    "- [domain-memory-governance](./domains/domain-memory-governance.md)",
                    "",
                    "## Reports",
                    "",
                    "## Sources",
                    "",
                    "## Entities",
                    "",
                    "## Concepts",
                    "",
                    "## Syntheses",
                    "",
                ]
            )
            + "\n",
        )

    def write_input(self, name: str, content: str) -> Path:
        path = self.external_root / name
        write_text(path, content)
        return path

    def run_ingest(self, target: Path, **kwargs):
        stdout = io.StringIO()
        with contextlib.redirect_stdout(stdout):
            exit_code = self.module.cmd_ingest(
                argparse.Namespace(
                    target=str(target),
                    domain=kwargs.get("domain", TEST_DOMAIN),
                    industry=kwargs.get("industry"),
                    category=kwargs.get("category"),
                    title=kwargs.get("title"),
                    allow_duplicate=kwargs.get("allow_duplicate", False),
                    json=kwargs.get("json", False),
                )
            )
        return exit_code, stdout.getvalue()

    def run_ingest_review(self, ingest_id: str, *, apply: bool = False, reject: bool = False, as_json: bool = False):
        stdout = io.StringIO()
        with contextlib.redirect_stdout(stdout):
            exit_code = self.module.cmd_ingest_review(
                argparse.Namespace(
                    ingest_id=ingest_id,
                    apply=apply,
                    reject=reject,
                    json=as_json,
                )
            )
        return exit_code, stdout.getvalue()

    def ingest_manifest_paths(self) -> list[Path]:
        return sorted(self.raw_root.glob(f"domains/{TEST_DOMAIN}/ingest/*/manifest.json"))

    def latest_manifest(self) -> dict[str, object]:
        manifest_path = self.ingest_manifest_paths()[-1]
        return json.loads(manifest_path.read_text(encoding="utf-8"))

    def latest_manifest_path(self) -> Path:
        return self.ingest_manifest_paths()[-1]

    def test_ingest_local_markdown_creates_bundle_and_source_draft(self):
        source_path = self.write_input(
            "alpha.md",
            "# Alpha Source\n\nThis is a durable governance note. " * 12,
        )

        exit_code, output = self.run_ingest(source_path, title="Alpha Source")

        self.assertEqual(exit_code, 0)
        self.assertIn("- review_status: ready_for_review", output)

        manifest = self.latest_manifest()
        self.assertEqual(manifest["review_status"], "ready_for_review")
        self.assertEqual(manifest["relation_type"], "new")
        self.assertTrue((self.repo_root / manifest["original_file"]).exists())
        self.assertTrue((self.repo_root / manifest["extracted_file"]).exists())
        self.assertTrue((self.repo_root / manifest["draft_bundle"]).exists())
        draft_page = self.repo_root / manifest["draft_pages"][0]
        self.assertTrue(draft_page.exists())
        self.assertIn("status: draft", draft_page.read_text(encoding="utf-8"))
        self.assertEqual(sorted((self.wiki_root / "sources").glob("*.md")), [])

    def test_ingest_records_markitdown_metadata_for_pdf_inputs(self):
        source_path = self.write_input("markitdown.pdf", "%PDF-1.4 fake payload for unit test")

        exit_code, output = self.run_ingest(source_path, title="MarkItDown PDF")

        self.assertEqual(exit_code, 0)
        self.assertIn("- review_status: ready_for_review", output)
        manifest = self.latest_manifest()
        self.assertEqual(manifest["extraction_mode"], "markitdown-local")
        self.assertEqual(manifest["extractor_name"], "markitdown")
        self.assertEqual(manifest["extractor_version"], "test")
        extracted_path = self.repo_root / manifest["extracted_file"]
        extracted_body = extracted_path.read_text(encoding="utf-8")
        self.assertIn("- Extraction mode: `markitdown-local`", extracted_body)
        self.assertIn("- Extractor: `markitdown@test`", extracted_body)

    def test_ingest_records_local_ocr_metadata_for_weak_pdf_fallbacks(self):
        self.module.kb_ingest_core.MarkItDownOfflineAdapter = _FakeAdapterOcrSuccess
        source_path = self.write_input("ocr.pdf", "%PDF-1.4 fake scanned payload")

        exit_code, output = self.run_ingest(source_path, title="OCR PDF")

        self.assertEqual(exit_code, 0)
        self.assertIn("- review_status: ready_for_review", output)
        self.assertIn("- ocr_applied: True", output)
        manifest = self.latest_manifest()
        self.assertEqual(manifest["extraction_mode"], "markitdown-local+ocrmypdf")
        self.assertEqual(manifest["ocr_applied"], True)
        self.assertEqual(manifest["ocr_engine"], "ocrmypdf+tesseract")
        self.assertEqual(manifest["ocr_languages"], "chi_sim+eng")
        self.assertTrue(manifest["notes"])
        extracted_body = (self.repo_root / manifest["extracted_file"]).read_text(encoding="utf-8")
        self.assertIn("- OCR applied: `yes`", extracted_body)
        self.assertIn("- OCR engine: `ocrmypdf+tesseract`", extracted_body)
        review_summary = (self.repo_root / manifest["draft_bundle"] / "review-summary.md").read_text(encoding="utf-8")
        self.assertIn("- OCR applied: `yes`", review_summary)

    def test_local_file_title_defaults_to_filename_not_markitdown_heading(self):
        self.module.kb_ingest_core.MarkItDownOfflineAdapter = _FakeAdapterWeirdTitle
        source_path = self.write_input("source-name.pdf", "%PDF-1.4 fake payload for title test")

        exit_code, _ = self.run_ingest(source_path)

        self.assertEqual(exit_code, 0)
        manifest = self.latest_manifest()
        self.assertEqual(manifest["source_title"], "source name")

    def test_ingest_cleans_up_partial_bundle_when_markitdown_fails(self):
        self.module.kb_ingest_core.MarkItDownOfflineAdapter = _FakeAdapterFailure
        source_path = self.write_input("broken.pdf", "%PDF-1.4 broken payload")

        with self.assertRaises(SystemExit):
            self.run_ingest(source_path, title="Broken PDF")

        ingest_root = self.raw_root / "domains" / TEST_DOMAIN / "ingest"
        self.assertEqual(sorted(ingest_root.glob("*")), [])
        self.assertEqual(sorted((self.output_root / "ingest-drafts").glob("*")), [])

    def test_ingest_review_apply_promotes_draft_updates_index_and_log(self):
        source_path = self.write_input(
            "apply-me.md",
            "# Apply Me\n\nFormal memory authority stays centralized and durable. " * 10,
        )
        self.run_ingest(source_path, title="Apply Me")
        manifest = self.latest_manifest()

        exit_code, output = self.run_ingest_review(str(manifest["ingest_id"]), apply=True)

        self.assertEqual(exit_code, 0)
        self.assertIn("- action: applied", output)
        applied_manifest = self.latest_manifest()
        self.assertEqual(applied_manifest["review_status"], "accepted")
        applied_path = self.repo_root / applied_manifest["applied_pages"][0]
        self.assertTrue(applied_path.exists())
        self.assertIn("status: active", applied_path.read_text(encoding="utf-8"))
        self.assertIn(f"./sources/{applied_path.name}", self.module.load_text(self.module.INDEX_PATH))
        self.assertIn(f"## [{self.today}] ingest | accept {applied_path.stem}", self.module.load_text(self.module.LOG_PATH))

    def test_apply_succeeds_when_index_entry_already_exists(self):
        source_path = self.write_input(
            "preindexed.md",
            "# Preindexed\n\nFormal memory authority stays centralized and durable. " * 10,
        )
        self.run_ingest(source_path, title="Preindexed")
        manifest = self.latest_manifest()
        source_name = Path(manifest["draft_pages"][0]).name
        self.module.dump_text(
            self.module.INDEX_PATH,
            self.module.load_text(self.module.INDEX_PATH).replace(
                "## Sources\n\n",
                f"## Sources\n\n- [source-{Path(source_name).stem.removeprefix('source-')}](./sources/{source_name}): preexisting entry\n\n",
                1,
            ),
        )

        exit_code, output = self.run_ingest_review(str(manifest["ingest_id"]), apply=True)

        self.assertEqual(exit_code, 0)
        self.assertIn("- action: applied", output)
        applied_manifest = self.latest_manifest()
        self.assertEqual(applied_manifest["review_status"], "accepted")
        self.assertEqual(
            self.module.load_text(self.module.INDEX_PATH).count(f"./sources/{source_name}"),
            1,
        )

    def test_apply_rolls_back_when_log_write_cannot_complete(self):
        source_path = self.write_input(
            "rollback-log.md",
            "# Rollback Log\n\nFormal memory authority stays centralized and durable. " * 10,
        )
        self.run_ingest(source_path, title="Rollback Log")
        manifest_path = self.latest_manifest_path()
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        self.module.LOG_PATH.unlink()

        with self.assertRaises(SystemExit):
            self.run_ingest_review(str(manifest["ingest_id"]), apply=True)

        rolled_back = json.loads(manifest_path.read_text(encoding="utf-8"))
        self.assertEqual(rolled_back["review_status"], "ready_for_review")
        self.assertEqual(sorted((self.wiki_root / "sources").glob("*.md")), [])

    def test_duplicate_ingest_is_blocked_by_default(self):
        source_path = self.write_input(
            "duplicate.md",
            "# Duplicate\n\nThis text is duplicated on purpose for testing. " * 12,
        )
        self.run_ingest(source_path, title="Duplicate Source")
        self.run_ingest(source_path, title="Duplicate Source")
        manifest = self.latest_manifest()

        self.assertEqual(manifest["review_status"], "blocked_duplicate")
        self.assertEqual(manifest["relation_type"], "duplicate")
        self.assertNotEqual(manifest["duplicate_status"], "none")

        with self.assertRaises(SystemExit):
            self.run_ingest_review(str(manifest["ingest_id"]), apply=True)

    def test_allow_duplicate_keeps_duplicate_ingest_ready_for_review(self):
        source_path = self.write_input(
            "duplicate-allowed.md",
            "# Duplicate Allowed\n\nThis text is duplicated on purpose for testing. " * 12,
        )
        self.run_ingest(source_path, title="Duplicate Allowed")
        self.run_ingest(source_path, title="Duplicate Allowed", allow_duplicate=True)
        manifest = self.latest_manifest()

        self.assertEqual(manifest["review_status"], "ready_for_review")
        self.assertEqual(manifest["relation_type"], "duplicate")

    def test_reject_marks_manifest_without_touching_canonical_wiki(self):
        source_path = self.write_input(
            "reject-me.md",
            "# Reject Me\n\nThis is enough text to generate a source draft safely. " * 10,
        )
        self.run_ingest(source_path, title="Reject Me")
        manifest = self.latest_manifest()

        exit_code, output = self.run_ingest_review(str(manifest["ingest_id"]), reject=True)

        self.assertEqual(exit_code, 0)
        self.assertIn("- action: rejected", output)
        rejected_manifest = self.latest_manifest()
        self.assertEqual(rejected_manifest["review_status"], "rejected")
        self.assertEqual(sorted((self.wiki_root / "sources").glob("*.md")), [])

    def test_apply_blocks_draft_with_broken_source_refs(self):
        source_path = self.write_input(
            "broken-refs.md",
            "# Broken Refs\n\nThis is enough text to generate a source draft safely. " * 10,
        )
        self.run_ingest(source_path, title="Broken Refs")
        manifest_path = self.latest_manifest_path()
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        draft_path = self.repo_root / manifest["draft_pages"][0]
        draft_text = draft_path.read_text(encoding="utf-8").replace("../../raw/", "../../missing-raw/", 1)
        draft_path.write_text(draft_text, encoding="utf-8")

        with self.assertRaises(SystemExit):
            self.run_ingest_review(str(manifest["ingest_id"]), apply=True)

        blocked_manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        self.assertEqual(blocked_manifest["review_status"], "ready_for_review")
        self.assertEqual(sorted((self.wiki_root / "sources").glob("*.md")), [])

    def test_accepted_ingest_cannot_be_rejected(self):
        source_path = self.write_input(
            "accepted-then-reject.md",
            "# Accepted Then Reject\n\nFormal memory authority stays centralized and durable. " * 10,
        )
        self.run_ingest(source_path, title="Accepted Then Reject")
        manifest_path = self.latest_manifest_path()
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        self.run_ingest_review(str(manifest["ingest_id"]), apply=True)

        with self.assertRaises(SystemExit):
            self.run_ingest_review(str(manifest["ingest_id"]), reject=True)

        accepted_manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        self.assertEqual(accepted_manifest["review_status"], "accepted")

    def test_ingest_draft_stays_out_of_query_until_apply(self):
        source_path = self.write_input(
            "query-gap.md",
            "# Query Gap\n\nThis document should not be visible before apply. " * 10,
        )
        self.run_ingest(source_path, title="Query Gap")

        results = self.module.query_pages(
            ["query", "gap"],
            "query gap",
            {"source"},
            limit=5,
        )

        self.assertEqual(results, [])

    def test_unsupported_extension_fails_fast(self):
        source_path = self.write_input("archive.zip", "not really a zip")

        with self.assertRaises(SystemExit):
            self.run_ingest(source_path, title="Archive")

    def test_unregistered_domain_fails_before_ingest_bundle_is_created(self):
        source_path = self.write_input(
            "unknown-domain.md",
            "# Unknown Domain\n\nFormal memory authority stays centralized and durable. " * 10,
        )

        with self.assertRaises(SystemExit):
            self.run_ingest(source_path, domain="typo-domain", title="Unknown Domain")

        self.assertEqual(sorted((self.raw_root / "domains" / "typo-domain" / "ingest").glob("*/manifest.json")), [])

    def test_same_timestamp_duplicate_ingests_get_distinct_ingest_ids(self):
        fixed_now = datetime(2026, 4, 17, 12, 0, 0, tzinfo=timezone.utc)
        self.module.now_local = lambda: fixed_now
        self.module.kb_ingest_core.now_local = lambda: fixed_now
        source_path = self.write_input(
            "same-second.md",
            "# Same Second\n\nFormal memory authority stays centralized and durable. " * 10,
        )

        self.run_ingest(source_path, title="Same Second")
        self.run_ingest(source_path, title="Same Second")

        manifests = [json.loads(path.read_text(encoding="utf-8")) for path in self.ingest_manifest_paths()]
        self.assertEqual(len(manifests), 2)
        self.assertNotEqual(manifests[0]["ingest_id"], manifests[1]["ingest_id"])


if __name__ == "__main__":
    unittest.main()
