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
from pathlib import Path

import kb_core


SCRIPT_PATH = Path(__file__).resolve().parents[1] / "kb"
TEST_DOMAIN = "memory-governance"
TEST_INDUSTRIES = ["ai"]
RAW_BUCKETS = {"articles", "assets", "inbox", "papers", "repos"}
DEFAULT_TEST_CATEGORIES = {
    "sources": ["reference"],
    "entities": ["tooling"],
    "concepts": ["architecture"],
    "syntheses": ["workflow"],
    "domains": ["governance"],
    "reports": ["maintenance"],
}


def load_module():
    loader = importlib.machinery.SourceFileLoader("kb_module", str(SCRIPT_PATH))
    spec = importlib.util.spec_from_loader(loader.name, loader)
    assert spec is not None
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    loader.exec_module(module)
    return module


def canonical_test_path(path: Path) -> Path:
    parts = list(path.parts)
    for index, part in enumerate(parts[:-1]):
        if part == "raw" and index + 1 < len(parts) and parts[index + 1] in RAW_BUCKETS:
            return Path(*parts[: index + 1], "domains", TEST_DOMAIN, *parts[index + 1 :])
    return path


def order_meta(meta: dict) -> dict:
    ordered: dict[str, object] = {}
    for key in ["title", "type", "status", "created_at", "updated_at", "source_refs", "related", "domain", "industries", "categories"]:
        if key in meta:
            ordered[key] = meta[key]
    for key, value in meta.items():
        if key not in ordered:
            ordered[key] = value
    return ordered


def enrich_canonical_content(path: Path, content: str) -> str:
    if path.parent.name not in DEFAULT_TEST_CATEGORIES or not content.startswith("---\n"):
        return content
    meta, body, has_frontmatter = kb_core.split_frontmatter(content)
    if not has_frontmatter:
        return content
    source_refs = meta.get("source_refs")
    if isinstance(source_refs, list):
        meta["source_refs"] = [
            str(item).replace("../../raw/inbox/", f"../../raw/domains/{TEST_DOMAIN}/inbox/")
            for item in source_refs
        ]
    meta.setdefault("domain", TEST_DOMAIN)
    meta.setdefault("industries", TEST_INDUSTRIES)
    meta.setdefault("categories", DEFAULT_TEST_CATEGORIES[path.parent.name])
    body = body.replace("../../raw/inbox/", f"../../raw/domains/{TEST_DOMAIN}/inbox/")
    return kb_core.render_page(order_meta(meta), body)


def write_text(path: Path, content: str) -> None:
    path = canonical_test_path(path)
    content = enrich_canonical_content(path, content)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


class KBQueryTests(unittest.TestCase):
    def setUp(self):
        self.module = load_module()
        self.today = self.module.today_str()
        self.maintenance_report_name = f"report-maintenance-{self.today}.md"
        self.drift_report_name = f"report-drift-review-{self.today}.md"
        self.tempdir = tempfile.TemporaryDirectory()
        self.repo_root = Path(self.tempdir.name).resolve()
        self.wiki_root = self.repo_root / "wiki"
        self.raw_root = self.repo_root / "raw"
        self.output_root = self.repo_root / "output"
        self.wiki_root.mkdir()
        self.raw_root.mkdir()
        self.output_root.mkdir()

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

        write_text(self.raw_root / "inbox" / "alpha.md", "# Alpha Raw\n")
        write_text(
            self.wiki_root / "domains" / "domain-memory-governance.md",
            "\n".join(
                [
                    "---",
                    'title: "Domain: Memory Governance"',
                    "type: domain",
                    "status: active",
                    "created_at: 2026-04-11",
                    "updated_at: 2026-04-11",
                    "source_refs: []",
                    "related:",
                    "  - ../overview",
                    "  - ../hot",
                    "  - ../syntheses/synthesis-memory-baseline",
                    "---",
                    "",
                    "# Domain: Memory Governance",
                    "",
                    "## Main Entry",
                    "",
                    "- [Memory Baseline](../syntheses/synthesis-memory-baseline.md)",
                    "",
                ]
            )
            + "\n",
        )

        write_text(
            self.wiki_root / "sources" / "source-alpha.md",
            "\n".join(
                [
                    "---",
                    'title: "Alpha Source"',
                    "type: source",
                    "status: active",
                    "created_at: 2026-04-11",
                    "updated_at: 2026-04-11",
                    "source_refs:",
                    "  - ../../raw/inbox/alpha.md",
                    "related: []",
                    "---",
                    "",
                    "# Alpha Source",
                    "",
                    "## Key Claims",
                    "",
                    "- Formal memory authority belongs to the global memory system.",
                    "",
                ]
            )
            + "\n",
        )
        write_text(
            self.wiki_root / "syntheses" / "synthesis-memory-baseline.md",
            "\n".join(
                [
                    "---",
                    'title: "Memory Baseline"',
                    "type: synthesis",
                    "status: active",
                    "created_at: 2026-04-11",
                    "updated_at: 2026-04-11",
                    "source_refs:",
                    "  - ../sources/source-alpha",
                    "related: []",
                    "---",
                    "",
                    "# Memory Baseline",
                    "",
                    "## Stable Conclusions",
                    "",
                    "- Formal memory authority remains centralized.",
                    "",
                ]
            )
            + "\n",
        )
        write_text(
            self.wiki_root / "concepts" / "concept-formal-memory-authority.md",
            "\n".join(
                [
                    "---",
                    'title: "Formal Memory Authority"',
                    "type: concept",
                    "status: active",
                    "created_at: 2026-04-11",
                    "updated_at: 2026-04-11",
                    "source_refs:",
                    "  - ../sources/source-alpha",
                    "related:",
                    "  - ../syntheses/synthesis-memory-baseline",
                    "---",
                    "",
                    "# Formal Memory Authority",
                    "",
                    "## Summary",
                    "",
                    "- Formal memory authority belongs to the shared global memory system.",
                    "",
                    "## Stable Claims",
                    "",
                    "- The workspace should not invent a second long-term memory authority.",
                    "",
                ]
            )
            + "\n",
        )
        write_text(
            self.wiki_root / "concepts" / "concept-formal-memory-authority-zh.md",
            "\n".join(
                [
                    "---",
                    'title: "Formal Memory Authority (中文)"',
                    "type: concept",
                    "status: active",
                    "created_at: 2026-04-11",
                    "updated_at: 2026-04-11",
                    "source_refs:",
                    "  - ../sources/source-alpha",
                    "related:",
                    "  - ../syntheses/synthesis-memory-baseline",
                    "---",
                    "",
                    "# Formal Memory Authority (中文)",
                    "",
                    "## Summary",
                    "",
                    "- Shared memory authority stays centralized.",
                    "",
                    "## Stable Claims",
                    "",
                    "- The workspace should not invent a second long-term memory authority.",
                    "",
                ]
            )
            + "\n",
        )
        write_text(
            self.wiki_root / "reports" / "report-memory-readiness-en.md",
            "\n".join(
                [
                    "---",
                    'title: "Memory Readiness (English)"',
                    "type: report",
                    "status: active",
                    "created_at: 2026-04-11",
                    "updated_at: 2026-04-11",
                    "source_refs: []",
                    "related:",
                    "  - ../concepts/concept-formal-memory-authority",
                    "---",
                    "",
                    "# Memory Readiness (English)",
                    "",
                    "## Findings",
                    "",
                    "- Formal memory authority remains centralized.",
                    "",
                ]
            )
            + "\n",
        )
        write_text(
            self.wiki_root / "overview.md",
            "\n".join(
                [
                    "---",
                    'title: "Knowledge Base Overview"',
                    "type: guide",
                    "status: active",
                    "created_at: 2026-04-11",
                    "updated_at: 2026-04-11",
                    "source_refs: []",
                    "related:",
                    "  - index",
                    "  - hot",
                    "  - log",
                    "  - domains/domain-memory-governance",
                    "  - reports/report-memory-readiness-en",
                    "---",
                    "",
                    "# Knowledge Base Overview",
                    "",
                    "## Current Scope",
                    "",
                    "- Canonical knowledge remains traceable back to explicit source pages.",
                    "",
                ]
            )
            + "\n",
        )
        write_text(
            self.wiki_root / "hot.md",
            "\n".join(
                [
                    "---",
                    'title: "Hot Path"',
                    "type: guide",
                    "status: active",
                    "created_at: 2026-04-11",
                    "updated_at: 2026-04-11",
                    "source_refs: []",
                    "related:",
                    "  - index",
                    "  - overview",
                    "  - log",
                    "  - domains/domain-memory-governance",
                    "  - reports/report-memory-readiness-en",
                    "  - syntheses/synthesis-memory-baseline",
                    "---",
                    "",
                    "# Hot Path",
                    "",
                    "## Start Here",
                    "",
                    "- [Domain](./domains/domain-memory-governance.md)",
                    "- [Synthesis](./syntheses/synthesis-memory-baseline.md)",
                    "- [Report](./reports/report-memory-readiness-en.md)",
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
                    "created_at: 2026-04-11",
                    "updated_at: 2026-04-11",
                    "source_refs: []",
                    "related:",
                    "  - index",
                    "  - overview",
                    "---",
                    "",
                    "# Knowledge Base Log",
                    "",
                    "## [2026-04-11] scaffold | test fixture",
                    "",
                    "- Added the minimal fixture pages for query and maintenance tests.",
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
                    "created_at: 2026-04-11",
                    "updated_at: 2026-04-11",
                    "source_refs: []",
                    "related:",
                    "  - overview",
                    "  - hot",
                    "  - log",
                    "---",
                    "",
                    "# Wiki Index",
                    "",
                    "## Overview",
                    "",
                    "- [overview](./overview.md)",
                    "- [hot](./hot.md)",
                    "- [log](./log.md)",
                    "",
                    "## Domains",
                    "",
                    "- [domain-memory-governance](./domains/domain-memory-governance.md)",
                    "",
                    "## Reports",
                    "",
                    "- [report-memory-readiness-en](./reports/report-memory-readiness-en.md)",
                    "",
                    "## Sources",
                    "",
                    "- [source-alpha](./sources/source-alpha.md)",
                    "",
                    "## Concepts",
                    "",
                    "- [concept-formal-memory-authority](./concepts/concept-formal-memory-authority.md)",
                    "- [concept-formal-memory-authority-zh](./concepts/concept-formal-memory-authority-zh.md)",
                    "",
                    "## Syntheses",
                    "",
                    "- [synthesis-memory-baseline](./syntheses/synthesis-memory-baseline.md)",
                    "",
                ]
            )
            + "\n",
        )

    def tearDown(self):
        self.tempdir.cleanup()

    def test_extract_frontmatter_links_resolves_md_shorthand(self):
        page = self.module.load_page(self.wiki_root / "concepts" / "concept-formal-memory-authority.md")

        links = self.module.extract_frontmatter_links(page)
        resolved = {path.relative_to(self.repo_root).as_posix() for _, path in links}

        self.assertEqual(
            resolved,
            {
                "wiki/sources/source-alpha.md",
                "wiki/syntheses/synthesis-memory-baseline.md",
            },
        )

    def test_add_auto_registers_new_page_in_index(self):
        exit_code = self.module.cmd_add(
            argparse.Namespace(
                kind="concept",
                slug="memory-latency",
                title="Memory Latency",
                source_ref=["wiki/sources/source-alpha.md"],
                related=["wiki/syntheses/synthesis-memory-baseline.md"],
                raw_ref=None,
                import_from=None,
                raw_dest=None,
                write_log=False,
                dry_run=False,
            )
        )

        self.assertEqual(exit_code, 0)
        created_path = self.wiki_root / "concepts" / "concept-memory-latency.md"
        self.assertTrue(created_path.exists())
        index_text = self.module.load_text(self.module.INDEX_PATH)
        self.assertIn("./concepts/concept-memory-latency.md", index_text)

    def test_add_can_optionally_write_log(self):
        exit_code = self.module.cmd_add(
            argparse.Namespace(
                kind="concept",
                slug="memory-cadence",
                title="Memory Cadence",
                source_ref=["wiki/sources/source-alpha.md"],
                related=["wiki/syntheses/synthesis-memory-baseline.md"],
                raw_ref=None,
                import_from=None,
                raw_dest=None,
                write_log=True,
                dry_run=False,
            )
        )

        self.assertEqual(exit_code, 0)
        log_text = self.module.load_text(self.module.LOG_PATH)
        self.assertIn(f"## [{self.today}] ingest | add concept-memory-cadence", log_text)
        self.assertIn("Added wiki/concepts/concept-memory-cadence.md", log_text)

    def test_query_pages_returns_scored_result_with_provenance(self):
        results = self.module.query_pages(
            ["formal", "memory"],
            "formal memory",
            {"concept", "source", "synthesis", "entity", "domain"},
            limit=5,
        )

        self.assertEqual(results[0].path.name, "concept-formal-memory-authority.md")
        self.assertIn("title", results[0].matched_fields)
        self.assertEqual(results[0].source_refs, ["wiki/sources/source-alpha.md"])
        self.assertEqual(results[0].related, ["wiki/syntheses/synthesis-memory-baseline.md"])
        self.assertIsNotNone(results[0].snippet)
        self.assertGreater(results[0].score, results[0].match_score)

    def test_render_query_results_json_contains_provenance(self):
        results = self.module.query_pages(
            ["authority"],
            "authority",
            {"concept", "source", "synthesis", "entity", "domain"},
            limit=5,
        )

        payload = json.loads(self.module.render_query_results("authority", results, as_json=True))

        self.assertEqual(payload["query"], "authority")
        self.assertEqual(payload["results"][0]["path"], "wiki/concepts/concept-formal-memory-authority.md")
        self.assertEqual(payload["results"][0]["source_refs"], ["wiki/sources/source-alpha.md"])
        self.assertEqual(payload["results"][0]["domain"], TEST_DOMAIN)
        self.assertEqual(payload["results"][0]["industries"], TEST_INDUSTRIES)
        self.assertEqual(payload["results"][0]["categories"], ["architecture"])
        self.assertIn("match_score", payload["results"][0])
        self.assertEqual(payload["results"][0]["suppressed_duplicates"], ["wiki/concepts/concept-formal-memory-authority-zh.md"])

    def test_query_pages_support_domain_and_category_filters(self):
        results = self.module.query_pages(
            ["memory"],
            "memory",
            {"concept", "report"},
            limit=5,
            domains={TEST_DOMAIN},
            categories={"maintenance"},
        )

        self.assertEqual([result.path.name for result in results], ["report-memory-readiness-en.md"])

    def test_check_maintenance_accepts_shorthand_source_refs(self):
        _, issues = self.module.check_maintenance()
        messages = [issue.message for issue in issues]

        self.assertFalse(any("source_refs should resolve" in message for message in messages))
        self.assertFalse(any("broken frontmatter ref" in message for message in messages))
        self.assertFalse(any("missing health link" in message for message in messages))

    def test_query_pages_dedupes_locale_mirror_results_by_default(self):
        results = self.module.query_pages(
            ["formal", "memory", "authority"],
            "formal memory authority",
            {"concept"},
            limit=5,
        )

        self.assertEqual([result.path.name for result in results], ["concept-formal-memory-authority.md"])
        self.assertEqual(results[0].suppressed_duplicates, ["wiki/concepts/concept-formal-memory-authority-zh.md"])

    def test_query_pages_can_keep_raw_duplicates_when_requested(self):
        results = self.module.query_pages(
            ["formal", "memory", "authority"],
            "formal memory authority",
            {"concept"},
            limit=5,
            dedupe=False,
        )

        self.assertEqual(
            [result.path.name for result in results],
            [
                "concept-formal-memory-authority.md",
                "concept-formal-memory-authority-zh.md",
            ],
        )

    def test_report_pages_are_downranked_against_answer_like_pages(self):
        results = self.module.query_pages(
            ["memory"],
            "memory",
            {"concept", "report"},
            limit=5,
        )

        self.assertEqual([result.kind for result in results[:2]], ["concept", "report"])
        self.assertGreater(results[0].score, results[1].score)

    def test_check_maintenance_warns_when_answer_page_lacks_canonical_source_support(self):
        write_text(self.raw_root / "inbox" / "raw-only.md", "# Raw Only\n")
        write_text(
            self.wiki_root / "concepts" / "concept-raw-only.md",
            "\n".join(
                [
                    "---",
                    'title: "Raw Only Concept"',
                    "type: concept",
                    "status: active",
                    "created_at: 2026-04-11",
                    "updated_at: 2026-04-11",
                    "source_refs:",
                    "  - ../../raw/inbox/raw-only.md",
                    "related: []",
                    "---",
                    "",
                    "# Raw Only Concept",
                    "",
                    "## Summary",
                    "",
                    "- This page points only to raw support.",
                    "",
                ]
            )
            + "\n",
        )
        write_text(
            self.module.INDEX_PATH,
            self.module.load_text(self.module.INDEX_PATH) + "- [concept-raw-only](./concepts/concept-raw-only.md)\n",
        )

        _, issues = self.module.check_maintenance()
        messages = [issue.message for issue in issues]

        self.assertIn(
            "wiki/concepts/concept-raw-only.md: source_refs should include at least one wiki/sources page",
            messages,
        )

    def test_check_maintenance_warns_when_hot_path_loses_report_link(self):
        write_text(
            self.wiki_root / "hot.md",
            "\n".join(
                [
                    "---",
                    'title: "Hot Path"',
                    "type: guide",
                    "status: active",
                    "created_at: 2026-04-11",
                    "updated_at: 2026-04-11",
                    "source_refs: []",
                    "related:",
                    "  - index",
                    "  - overview",
                    "  - log",
                    "  - domains/domain-memory-governance",
                    "  - syntheses/synthesis-memory-baseline",
                    "---",
                    "",
                    "# Hot Path",
                    "",
                    "## Start Here",
                    "",
                    "- [Domain](./domains/domain-memory-governance.md)",
                    "- [Synthesis](./syntheses/synthesis-memory-baseline.md)",
                    "",
                ]
            )
            + "\n",
        )

        _, issues = self.module.check_maintenance()
        messages = [issue.message for issue in issues]

        self.assertIn("wiki/hot.md: missing health link for `report` pages", messages)

    def test_build_maintenance_payload_includes_issue_counts(self):
        write_text(self.raw_root / "inbox" / "raw-only.md", "# Raw Only\n")
        write_text(
            self.wiki_root / "concepts" / "concept-raw-only.md",
            "\n".join(
                [
                    "---",
                    'title: "Raw Only Concept"',
                    "type: concept",
                    "status: active",
                    "created_at: 2026-04-11",
                    "updated_at: 2026-04-11",
                    "source_refs:",
                    "  - ../../raw/inbox/raw-only.md",
                    "related: []",
                    "---",
                    "",
                    "# Raw Only Concept",
                    "",
                    "## Summary",
                    "",
                    "- This page points only to raw support.",
                    "",
                ]
            )
            + "\n",
        )
        write_text(
            self.module.INDEX_PATH,
            self.module.load_text(self.module.INDEX_PATH) + "- [concept-raw-only](./concepts/concept-raw-only.md)\n",
        )

        counts, issues = self.module.check_maintenance()
        payload = self.module.build_maintenance_payload(counts, issues)

        self.assertEqual(payload["status"], "ok")
        self.assertEqual(payload["health_verdict"], "needs-attention")
        self.assertEqual(payload["issue_counts"], {"warn": 1})
        self.assertEqual(payload["issue_groups"], {"provenance": [{"level": "warn", "message": "wiki/concepts/concept-raw-only.md: source_refs should include at least one wiki/sources page"}]})
        self.assertEqual(payload["issues"][0]["level"], "warn")
        self.assertEqual(payload["issues"][0]["category"], "provenance")

    def test_render_maintenance_summary_json_includes_report_metadata(self):
        counts, issues = self.module.check_maintenance()
        report_path = self.wiki_root / "reports" / self.maintenance_report_name

        payload = json.loads(
            self.module.render_maintenance_summary(
                counts,
                issues,
                as_json=True,
                report_path=report_path,
                report_action="would_write",
            )
        )

        self.assertEqual(payload["status"], "ok")
        self.assertEqual(payload["health_verdict"], "healthy")
        self.assertEqual(payload["report_path"], f"wiki/reports/{self.maintenance_report_name}")
        self.assertEqual(payload["report_action"], "would_write")

    def test_maintain_write_report_syncs_index_and_keeps_workspace_healthy(self):
        stdout = io.StringIO()
        with contextlib.redirect_stdout(stdout):
            exit_code = self.module.cmd_maintain(
                argparse.Namespace(
                    write_report=True,
                    dry_run=False,
                    json=False,
                )
            )

        self.assertEqual(exit_code, 0)
        summary = stdout.getvalue()
        self.assertIn("- health_verdict: healthy", summary)
        self.assertIn("- reports: 2", summary)
        self.assertIn(f"wiki/reports/{self.maintenance_report_name}", summary)

        counts, issues = self.module.check_maintenance()
        self.assertEqual(counts["report"], 2)
        self.assertEqual(issues, [])
        self.assertIn(f"./reports/{self.maintenance_report_name}", self.module.load_text(self.module.INDEX_PATH))

    def test_render_maintenance_summary_text_includes_health_verdict_and_groups(self):
        write_text(self.raw_root / "inbox" / "raw-only.md", "# Raw Only\n")
        write_text(
            self.wiki_root / "concepts" / "concept-raw-only.md",
            "\n".join(
                [
                    "---",
                    'title: "Raw Only Concept"',
                    "type: concept",
                    "status: active",
                    "created_at: 2026-04-11",
                    "updated_at: 2026-04-11",
                    "source_refs:",
                    "  - ../../raw/inbox/raw-only.md",
                    "related: []",
                    "---",
                    "",
                    "# Raw Only Concept",
                    "",
                    "## Summary",
                    "",
                    "- This page points only to raw support.",
                    "",
                ]
            )
            + "\n",
        )
        write_text(
            self.module.INDEX_PATH,
            self.module.load_text(self.module.INDEX_PATH) + "- [concept-raw-only](./concepts/concept-raw-only.md)\n",
        )

        counts, issues = self.module.check_maintenance()
        summary = self.module.render_maintenance_summary(counts, issues, as_json=False)

        self.assertIn("- health_verdict: needs-attention", summary)
        self.assertIn("- issue_groups: provenance=1", summary)
        self.assertIn("[warn][provenance] wiki/concepts/concept-raw-only.md: source_refs should include at least one wiki/sources page", summary)

    def test_render_maintenance_report_includes_verdict_groups_and_recommendations(self):
        write_text(self.raw_root / "inbox" / "raw-only.md", "# Raw Only\n")
        write_text(
            self.wiki_root / "concepts" / "concept-raw-only.md",
            "\n".join(
                [
                    "---",
                    'title: "Raw Only Concept"',
                    "type: concept",
                    "status: active",
                    "created_at: 2026-04-11",
                    "updated_at: 2026-04-11",
                    "source_refs:",
                    "  - ../../raw/inbox/raw-only.md",
                    "related: []",
                    "---",
                    "",
                    "# Raw Only Concept",
                    "",
                    "## Summary",
                    "",
                    "- This page points only to raw support.",
                    "",
                ]
            )
            + "\n",
        )
        write_text(
            self.module.INDEX_PATH,
            self.module.load_text(self.module.INDEX_PATH) + "- [concept-raw-only](./concepts/concept-raw-only.md)\n",
        )

        counts, issues = self.module.check_maintenance()
        report = self.module.render_maintenance_report(counts, issues)

        self.assertIn("- Health verdict: `needs-attention`", report)
        self.assertIn("## Findings By Category", report)
        self.assertIn("### provenance", report)
        self.assertIn("Repair weak or duplicated provenance so answer-like pages keep clear canonical support.", report)

    def test_reindex_write_updates_index_updated_at_when_it_adds_missing_entry(self):
        write_text(
            self.wiki_root / "reports" / "report-new-health.md",
            "\n".join(
                [
                    "---",
                    'title: "New Health Report"',
                    "type: report",
                    "status: active",
                    "created_at: 2026-04-11",
                    "updated_at: 2026-04-11",
                    "source_refs: []",
                    "related:",
                    "  - ../overview.md",
                    "---",
                    "",
                    "# New Health Report",
                    "",
                ]
            )
            + "\n",
        )
        write_text(
            self.module.INDEX_PATH,
            self.module.load_text(self.module.INDEX_PATH).replace("updated_at: 2026-04-11", "updated_at: 2026-04-10", 1),
        )

        exit_code = self.module.cmd_reindex(
            argparse.Namespace(
                write=True,
                prune=False,
                dry_run=False,
            )
        )

        self.assertEqual(exit_code, 0)
        index_text = self.module.load_text(self.module.INDEX_PATH)
        self.assertIn("./reports/report-new-health.md", index_text)
        self.assertIn(f"updated_at: {self.today}", index_text)

    def test_remove_index_lines_for_path_updates_index_updated_at(self):
        write_text(
            self.module.INDEX_PATH,
            self.module.load_text(self.module.INDEX_PATH).replace("updated_at: 2026-04-11", "updated_at: 2026-04-10", 1),
        )

        removed = self.module.remove_index_lines_for_path(self.wiki_root / "reports" / "report-memory-readiness-en.md", dry_run=False)

        self.assertEqual(removed, 1)
        index_text = self.module.load_text(self.module.INDEX_PATH)
        self.assertNotIn("./reports/report-memory-readiness-en.md", index_text)
        self.assertIn(f"updated_at: {self.today}", index_text)

    def test_log_write_updates_log_updated_at(self):
        write_text(
            self.module.LOG_PATH,
            self.module.load_text(self.module.LOG_PATH).replace("updated_at: 2026-04-11", "updated_at: 2026-04-10", 1),
        )

        exit_code = self.module.cmd_log(
            argparse.Namespace(
                action="maintenance",
                summary="refresh metadata",
                note=["Updated the log metadata semantics."],
                dry_run=False,
            )
        )

        self.assertEqual(exit_code, 0)
        log_text = self.module.load_text(self.module.LOG_PATH)
        self.assertIn(f"updated_at: {self.today}", log_text)
        self.assertIn(f"## [{self.today}] maintenance | refresh metadata", log_text)

    def test_delete_can_optionally_write_log(self):
        target = self.wiki_root / "reports" / "report-memory-readiness-en.md"

        exit_code = self.module.cmd_delete(
            argparse.Namespace(
                path=str(target),
                with_raw=False,
                write_log=True,
                dry_run=False,
            )
        )

        self.assertEqual(exit_code, 0)
        self.assertFalse(target.exists())
        log_text = self.module.load_text(self.module.LOG_PATH)
        self.assertIn(f"## [{self.today}] maintenance | delete report-memory-readiness-en", log_text)
        self.assertIn("Deleted wiki/reports/report-memory-readiness-en.md", log_text)

    def test_drift_review_is_stable_for_aligned_fixture(self):
        signals = self.module.drift_review_signals()
        payload = self.module.build_drift_review_payload(signals)

        self.assertEqual(signals, [])
        self.assertEqual(payload["status"], "ok")
        self.assertEqual(payload["drift_verdict"], "stable")

    def test_drift_review_detects_source_lag(self):
        write_text(
            self.wiki_root / "sources" / "source-alpha.md",
            "\n".join(
                [
                    "---",
                    'title: "Alpha Source"',
                    "type: source",
                    "status: active",
                    "created_at: 2026-04-11",
                    "updated_at: 2026-04-12",
                    "source_refs:",
                    "  - ../../raw/inbox/alpha.md",
                    "related: []",
                    "---",
                    "",
                    "# Alpha Source",
                    "",
                    "## Key Claims",
                    "",
                    "- Formal memory authority belongs to the global memory system.",
                    "",
                ]
            )
            + "\n",
        )

        signals = self.module.drift_review_signals()
        source_lag_pages = {(signal.category, signal.page) for signal in signals}

        self.assertIn(("source-lag", "wiki/concepts/concept-formal-memory-authority.md"), source_lag_pages)
        self.assertIn(("source-lag", "wiki/syntheses/synthesis-memory-baseline.md"), source_lag_pages)

    def test_drift_review_detects_log_metadata_lag(self):
        write_text(
            self.module.LOG_PATH,
            "\n".join(
                [
                    "---",
                    'title: "Knowledge Base Log"',
                    "type: report",
                    "status: active",
                    "created_at: 2026-04-11",
                    "updated_at: 2026-04-10",
                    "source_refs: []",
                    "related:",
                    "  - index",
                    "  - overview",
                    "---",
                    "",
                    "# Knowledge Base Log",
                    "",
                    "## [2026-04-11] scaffold | test fixture",
                    "",
                    "- Added the minimal fixture pages for query and maintenance tests.",
                    "",
                ]
            )
            + "\n",
        )

        signals = self.module.drift_review_signals()
        metadata_lag_pages = {(signal.category, signal.page) for signal in signals}

        self.assertIn(("metadata-lag", "wiki/log.md"), metadata_lag_pages)

    def test_render_drift_review_summary_json_includes_report_metadata(self):
        signals = self.module.drift_review_signals()
        report_path = self.wiki_root / "reports" / self.drift_report_name
        payload = json.loads(
            self.module.render_drift_review_summary(
                signals,
                as_json=True,
                report_path=report_path,
                report_action="would_write",
            )
        )

        self.assertEqual(payload["status"], "ok")
        self.assertEqual(payload["drift_verdict"], "stable")
        self.assertEqual(payload["report_path"], f"wiki/reports/{self.drift_report_name}")
        self.assertEqual(payload["report_action"], "would_write")

    def test_drift_review_write_report_renders_post_write_stable_state(self):
        write_text(
            self.wiki_root / "reports" / "report-memory-readiness-en.md",
            "\n".join(
                [
                    "---",
                    'title: "Memory Readiness (English)"',
                    "type: report",
                    "status: active",
                    "created_at: 2026-04-11",
                    "updated_at: 2026-04-10",
                    "source_refs: []",
                    "related:",
                    "  - ../concepts/concept-formal-memory-authority",
                    "---",
                    "",
                    "# Memory Readiness (English)",
                    "",
                    "## Findings",
                    "",
                    "- Formal memory authority remains centralized.",
                    "",
                ]
            )
            + "\n",
        )

        signals = self.module.drift_review_signals()
        self.assertEqual([(signal.category, signal.page) for signal in signals], [("report-lag", "wiki/reports")])

        stdout = io.StringIO()
        with contextlib.redirect_stdout(stdout):
            exit_code = self.module.cmd_drift_review(
                argparse.Namespace(
                    json=False,
                    write_report=True,
                    dry_run=False,
                )
            )

        self.assertEqual(exit_code, 0)
        self.assertIn("- drift_verdict: stable", stdout.getvalue())

        report_path = self.wiki_root / "reports" / self.drift_report_name
        report_content = self.module.load_text(report_path)

        self.assertIn("- Drift verdict: `stable`", report_content)
        self.assertIn("- signal counts: none", report_content)
        self.assertNotIn("report-lag", report_content)
        self.assertIn(f"./reports/{self.drift_report_name}", self.module.load_text(self.module.INDEX_PATH))
        self.assertEqual(self.module.drift_review_signals(), [])
        _, issues = self.module.check_maintenance()
        self.assertEqual(issues, [])


if __name__ == "__main__":
    unittest.main()
