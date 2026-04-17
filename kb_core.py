from __future__ import annotations

import os
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable


STABLE_HEADINGS = [
    "Stable Claims",
    "Stable Conclusions",
    "Key Claims",
    "Practical Meaning",
    "Summary",
    "Current Thesis",
    "Current Judgment",
    "Recommendation",
]
QUERY_KIND_BONUS = {
    "concept": 8,
    "synthesis": 7,
    "entity": 5,
    "domain": 3,
    "source": 0,
    "report": -8,
}
QUERY_STATUS_BONUS = {
    "active": 1,
    "draft": -2,
    "archived": -4,
}
LOCALE_VARIANT_MARKERS = [
    "zh-cn",
    "zh-hans",
    "zh-hant",
    "zh",
    "cn",
    "chinese",
    "中文",
    "中文版",
    "简体中文",
    "繁体中文",
    "简中",
    "繁中",
    "en-us",
    "en-gb",
    "en-uk",
    "english",
    "en",
    "英文版",
    "英文",
    "bilingual",
    "双语",
]
LOCALE_VARIANT_PATTERN = "|".join(re.escape(item) for item in LOCALE_VARIANT_MARKERS)
TRAILING_LOCALE_PAREN_RE = re.compile(rf"(?:\s*\((?:{LOCALE_VARIANT_PATTERN})\))+$", re.IGNORECASE)
TRAILING_LOCALE_TOKEN_RE = re.compile(rf"(?:[\s\-_]+(?:{LOCALE_VARIANT_PATTERN}))+$", re.IGNORECASE)


@dataclass(frozen=True)
class RepoPaths:
    repo_root: Path
    wiki_root: Path
    raw_root: Path
    output_root: Path
    index_path: Path
    log_path: Path
    page_layout: dict[str, dict[str, object]]

    @property
    def canonical_dirs(self) -> set[str]:
        return {str(spec["dir"].name) for spec in self.page_layout.values()}


@dataclass
class Page:
    path: Path
    meta: dict
    body: str
    has_frontmatter: bool
    repo_root: Path

    @property
    def repo_rel(self) -> str:
        return self.path.relative_to(self.repo_root).as_posix()

    @property
    def domain(self) -> str:
        return normalize_tag_value(self.meta.get("domain"))

    @property
    def industries(self) -> list[str]:
        return normalize_string_list(self.meta.get("industries"))

    @property
    def categories(self) -> list[str]:
        return normalize_string_list(self.meta.get("categories"))


@dataclass
class QueryFilters:
    domains: set[str]
    industries: set[str]
    categories: set[str]


@dataclass
class QueryResult:
    path: Path
    kind: str
    title: str
    match_score: int
    score: int
    matched_fields: list[str]
    snippet: str | None
    source_refs: list[str]
    related: list[str]
    suppressed_duplicates: list[str]
    domain: str
    industries: list[str]
    categories: list[str]


def build_repo_paths(
    repo_root: Path,
    wiki_root: Path,
    raw_root: Path,
    output_root: Path,
    page_layout: dict[str, dict[str, object]],
) -> RepoPaths:
    return RepoPaths(
        repo_root=repo_root,
        wiki_root=wiki_root,
        raw_root=raw_root,
        output_root=output_root,
        index_path=wiki_root / "index.md",
        log_path=wiki_root / "log.md",
        page_layout=page_layout,
    )


def load_text(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def split_frontmatter(text: str) -> tuple[dict, str, bool]:
    if not text.startswith("---\n"):
        return {}, text, False
    match = re.match(r"^---\n(.*?)\n---\n?(.*)$", text, re.DOTALL)
    if not match:
        return {}, text, False
    return parse_frontmatter(match.group(1)), match.group(2), True


def parse_frontmatter(frontmatter: str) -> dict:
    data: dict[str, object] = {}
    current_key: str | None = None
    for raw_line in frontmatter.splitlines():
        line = raw_line.rstrip()
        if not line:
            continue
        if re.match(r"^\s+-\s+", line):
            if current_key is None:
                continue
            data.setdefault(current_key, [])
            assert isinstance(data[current_key], list)
            data[current_key].append(parse_scalar(re.sub(r"^\s+-\s+", "", line)))
            continue
        if ":" not in line:
            continue
        key, value = line.split(":", 1)
        key = key.strip()
        value = value.strip()
        if not value:
            current_key = key
            data[key] = []
        else:
            current_key = key
            data[key] = parse_scalar(value)
    return data


def parse_scalar(value: str) -> object:
    value = value.strip()
    if value.startswith('"') and value.endswith('"'):
        return value[1:-1]
    if value.startswith("'") and value.endswith("'"):
        return value[1:-1]
    if value == "[]":
        return []
    return value


def load_page(paths: RepoPaths, path: Path) -> Page:
    text = load_text(path)
    meta, body, has_frontmatter = split_frontmatter(text)
    return Page(path=path, meta=meta, body=body, has_frontmatter=has_frontmatter, repo_root=paths.repo_root)


def render_frontmatter(meta: dict) -> str:
    lines = ["---"]
    for key, value in meta.items():
        if isinstance(value, list):
            if not value:
                lines.append(f"{key}: []")
            else:
                lines.append(f"{key}:")
                lines.extend(f"  - {item}" for item in value)
        else:
            safe_value = str(value).replace('"', '\\"')
            lines.append(f'{key}: "{safe_value}"' if key == "title" else f"{key}: {safe_value}")
    lines.append("---")
    return "\n".join(lines)


def render_page(meta: dict, body: str) -> str:
    body_text = body.lstrip("\n").rstrip()
    if body_text:
        return render_frontmatter(meta) + "\n\n" + body_text + "\n"
    return render_frontmatter(meta) + "\n"


def normalize_reference_for_page(paths: RepoPaths, page_path: Path, ref: str) -> str:
    candidate = Path(ref)
    if candidate.is_absolute():
        try:
            candidate = candidate.resolve().relative_to(paths.repo_root)
        except ValueError:
            return ref
        resolved = paths.repo_root / candidate
        return Path(os.path.relpath(resolved, start=page_path.parent)).as_posix()
    if ref.startswith(("wiki/", "raw/", "output/")):
        resolved = (paths.repo_root / ref).resolve()
        return Path(os.path.relpath(resolved, start=page_path.parent)).as_posix()
    return ref


def resolve_repo_reference(page_path: Path, ref: str) -> Path:
    raw_target = ref.strip().split("#", 1)[0]
    candidate = (page_path.parent / raw_target).resolve()
    if candidate.exists():
        return candidate
    if not candidate.suffix:
        suffix_candidate = candidate.with_suffix(".md")
        if suffix_candidate.exists():
            return suffix_candidate
        return suffix_candidate
    return candidate


def repo_rel(paths: RepoPaths, path: Path) -> str:
    return path.relative_to(paths.repo_root).as_posix()


def canonical_pages(paths: RepoPaths) -> list[Path]:
    pages: list[Path] = []
    for spec in paths.page_layout.values():
        pages.extend(sorted(Path(spec["dir"]).glob("*.md")))
    return sorted(pages)


def canonical_page_for_path(paths: RepoPaths, path: Path) -> bool:
    try:
        rel_parts = path.relative_to(paths.wiki_root).parts
    except ValueError:
        return False
    return len(rel_parts) == 2 and rel_parts[0] in paths.canonical_dirs and rel_parts[1].endswith(".md")


def canonical_kind_for_path(paths: RepoPaths, path: Path) -> str | None:
    if not canonical_page_for_path(paths, path):
        return None
    directory = path.relative_to(paths.wiki_root).parts[0]
    for kind, spec in paths.page_layout.items():
        if Path(spec["dir"]).name == directory:
            return kind
    return None


def normalize_search_text(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip().lower()


def query_terms_from_parts(parts: list[str]) -> list[str]:
    text = " ".join(parts)
    return [term for term in (normalize_search_text(item) for item in re.split(r"\s+", text)) if term]


def normalize_tag_value(value: object) -> str:
    return slugify(str(value or "").strip())


def normalize_string_list(value: object) -> list[str]:
    if not isinstance(value, list):
        return []
    normalized: list[str] = []
    seen: set[str] = set()
    for item in value:
        token = slugify(str(item or "").strip())
        if not token or token in seen:
            continue
        seen.add(token)
        normalized.append(token)
    return normalized


def slugify(text: str) -> str:
    fragment = text.strip().lower()
    fragment = re.sub(r"[^a-z0-9\u4e00-\u9fff]+", "-", fragment)
    fragment = re.sub(r"-{2,}", "-", fragment).strip("-")
    return fragment


def extract_sections(body: str) -> dict[str, list[str]]:
    sections: dict[str, list[str]] = {}
    current: str | None = None
    for line in body.splitlines():
        heading_match = re.match(r"^##\s+(.*)$", line)
        if heading_match:
            current = heading_match.group(1).strip()
            sections.setdefault(current, [])
            continue
        if current is not None:
            sections[current].append(line)
    return sections


def extract_candidate_facts(page: Page, limit: int) -> list[str]:
    sections = extract_sections(page.body)
    facts: list[str] = []
    for heading in STABLE_HEADINGS:
        for line in sections.get(heading, []):
            stripped = line.strip()
            if stripped.startswith("- "):
                fact = stripped[2:].strip().replace("`", "")
                if fact and "TODO" not in fact and not fact.startswith("["):
                    facts.append(fact)
            elif heading in {"Summary", "Current Thesis", "Recommendation"} and stripped and not stripped.startswith("#"):
                facts.append(stripped.replace("`", ""))
        if len(facts) >= limit:
            break
    deduped: list[str] = []
    seen: set[str] = set()
    for fact in facts:
        normalized = re.sub(r"\s+", " ", fact).strip()
        if normalized and normalized not in seen:
            seen.add(normalized)
            deduped.append(normalized)
        if len(deduped) >= limit:
            break
    return deduped


def page_heading_lines(page: Page) -> list[str]:
    headings: list[str] = []
    for line in page.body.splitlines():
        if line.startswith("#"):
            headings.append(line.lstrip("#").strip())
    return headings


def page_text_lines(page: Page) -> list[str]:
    lines: list[str] = []
    for line in page.body.splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            continue
        if stripped.startswith("- "):
            stripped = stripped[2:].strip()
        if stripped and "TODO" not in stripped:
            lines.append(stripped.replace("`", ""))
    return lines


def matches_any_term(text: str, terms: list[str]) -> bool:
    normalized = normalize_search_text(text)
    return any(term in normalized for term in terms)


def truncate_snippet(text: str, limit: int = 180) -> str:
    compact = re.sub(r"\s+", " ", text).strip()
    if len(compact) <= limit:
        return compact
    return compact[: limit - 3].rstrip() + "..."


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


def resolve_meta_paths(paths: RepoPaths, page: Page, key: str) -> list[str]:
    values = page.meta.get(key, [])
    if not isinstance(values, list):
        return []
    resolved_values: list[str] = []
    for raw_value in values:
        target = str(raw_value).strip()
        if not target:
            continue
        resolved = resolve_repo_reference(page.path, target)
        try:
            resolved_values.append(repo_rel(paths, resolved))
        except ValueError:
            resolved_values.append(target)
    return resolved_values


def strip_locale_suffix(text: str) -> tuple[str, bool]:
    normalized = normalize_search_text(text).replace("_", "-")
    base = normalized
    changed = False
    while True:
        updated = TRAILING_LOCALE_PAREN_RE.sub("", base)
        updated = TRAILING_LOCALE_TOKEN_RE.sub("", updated)
        updated = re.sub(r"\s+", " ", updated).strip(" -_")
        if updated == base:
            break
        base = updated
        changed = True
    return base, changed


def page_topic_stem(paths: RepoPaths, path: Path) -> str:
    stem = path.stem
    for spec in paths.page_layout.values():
        prefix = str(spec["prefix"])
        if stem.startswith(prefix):
            stem = stem[len(prefix) :]
            break
    return stem.replace("_", " ").replace("-", " ")


def query_dedupe_identity(paths: RepoPaths, result: QueryResult) -> dict[str, object]:
    title_key, title_variant = strip_locale_suffix(result.title)
    stem_key, stem_variant = strip_locale_suffix(page_topic_stem(paths, result.path))
    return {
        "title_key": title_key,
        "title_variant": title_variant,
        "stem_key": stem_key,
        "stem_variant": stem_variant,
    }


def query_quality_bonus(source_refs: list[str], stable_facts: list[str]) -> int:
    bonus = 0
    if source_refs:
        bonus += 1
    if stable_facts:
        bonus += 1
    return bonus


def query_locale_variant_penalty(paths: RepoPaths, page: Page) -> int:
    title_variant = strip_locale_suffix(str(page.meta.get("title") or ""))[1]
    stem_variant = strip_locale_suffix(page_topic_stem(paths, page.path))[1]
    return -2 if title_variant or stem_variant else 0


def query_rank_score(paths: RepoPaths, page: Page, kind: str, match_score: int, source_refs: list[str], stable_facts: list[str]) -> int:
    status = normalize_search_text(str(page.meta.get("status") or "active"))
    kind_bonus = QUERY_KIND_BONUS.get(kind, 0)
    status_bonus = QUERY_STATUS_BONUS.get(status, 0)
    quality_bonus = query_quality_bonus(source_refs, stable_facts)
    locale_variant_penalty = query_locale_variant_penalty(paths, page)
    return match_score + kind_bonus + status_bonus + quality_bonus + locale_variant_penalty


def select_query_snippet(page: Page, terms: list[str]) -> str | None:
    candidates: list[str] = []
    candidates.extend(extract_candidate_facts(page, 8))
    candidates.extend(page_heading_lines(page))
    candidates.extend(page_text_lines(page))

    seen: set[str] = set()
    for candidate in candidates:
        compact = re.sub(r"\s+", " ", candidate).strip()
        if not compact or compact in seen:
            continue
        seen.add(compact)
        if matches_any_term(compact, terms):
            return truncate_snippet(compact)

    for candidate in candidates:
        compact = re.sub(r"\s+", " ", candidate).strip()
        if compact:
            return truncate_snippet(compact)
    return None


def matches_query_filters(page: Page, filters: QueryFilters) -> bool:
    if filters.domains and page.domain not in filters.domains:
        return False
    if filters.industries and not filters.industries.intersection(page.industries):
        return False
    if filters.categories and not filters.categories.intersection(page.categories):
        return False
    return True


def query_result_for_page(paths: RepoPaths, page: Page, terms: list[str], phrase: str) -> QueryResult | None:
    kind = canonical_kind_for_path(paths, page.path)
    if kind is None:
        return None

    title = str(page.meta.get("title") or page.path.stem)
    title_text = normalize_search_text(title)
    path_text = normalize_search_text(page.repo_rel)
    headings = page_heading_lines(page)
    heading_texts = [normalize_search_text(item) for item in headings]
    stable_facts = extract_candidate_facts(page, 8)
    stable_texts = [normalize_search_text(item) for item in stable_facts]
    body_text = normalize_search_text(page.body)
    combined_text = " ".join([title_text, path_text, *heading_texts, *stable_texts, body_text]).strip()

    match_score = 0
    matched_fields: list[str] = []
    metadata_fields = {
        "domain": normalize_search_text(page.domain),
        "industry": " ".join(normalize_search_text(item) for item in page.industries),
        "category": " ".join(normalize_search_text(item) for item in page.categories),
    }

    for term in terms:
        if term in title_text:
            match_score += 8
            matched_fields.append("title")
        if term in path_text:
            match_score += 6
            matched_fields.append("path")
        if any(term in item for item in heading_texts):
            match_score += 5
            matched_fields.append("heading")
        if any(term in item for item in stable_texts):
            match_score += 6
            matched_fields.append("stable-claim")
        body_hits = body_text.count(term)
        if body_hits:
            match_score += min(body_hits, 3)
            matched_fields.append("body")
        if metadata_fields["domain"] and term in metadata_fields["domain"]:
            match_score += 2
            matched_fields.append("domain")
        if metadata_fields["industry"] and term in metadata_fields["industry"]:
            match_score += 2
            matched_fields.append("industry")
        if metadata_fields["category"] and term in metadata_fields["category"]:
            match_score += 2
            matched_fields.append("category")

    if phrase:
        if phrase in title_text:
            match_score += 6
            matched_fields.append("title-phrase")
        elif phrase in combined_text:
            match_score += 4
            matched_fields.append("phrase")

    if terms and all(term in combined_text for term in terms):
        match_score += 3
        matched_fields.append("all-terms")

    if match_score == 0:
        return None

    source_refs = resolve_meta_paths(paths, page, "source_refs")
    related = resolve_meta_paths(paths, page, "related")
    score = query_rank_score(paths, page, kind, match_score, source_refs, stable_facts)
    deduped_fields = list(dict.fromkeys(matched_fields))
    return QueryResult(
        path=page.path,
        kind=kind,
        title=title,
        match_score=match_score,
        score=score,
        matched_fields=deduped_fields,
        snippet=select_query_snippet(page, terms),
        source_refs=source_refs,
        related=related,
        suppressed_duplicates=[],
        domain=page.domain,
        industries=page.industries,
        categories=page.categories,
    )


def dedupe_query_results(paths: RepoPaths, results: list[QueryResult]) -> list[QueryResult]:
    if len(results) < 2:
        return results

    identities = {result.path: query_dedupe_identity(paths, result) for result in results}
    stem_groups: dict[tuple[str, str], list[QueryResult]] = {}
    title_groups: dict[tuple[str, str], list[QueryResult]] = {}

    for result in results:
        identity = identities[result.path]
        stem_key = str(identity["stem_key"]).strip()
        title_key = str(identity["title_key"]).strip()
        if stem_key:
            stem_groups.setdefault((result.kind, stem_key), []).append(result)
        if title_key:
            title_groups.setdefault((result.kind, title_key), []).append(result)

    active_stem_groups = {
        key
        for key, members in stem_groups.items()
        if len(members) > 1 and any(bool(identities[item.path]["stem_variant"]) for item in members)
    }
    active_title_groups = {
        key
        for key, members in title_groups.items()
        if len(members) > 1 and any(bool(identities[item.path]["title_variant"]) for item in members)
    }

    deduped: list[QueryResult] = []
    winners: dict[tuple[str, str, str], QueryResult] = {}
    for result in results:
        identity = identities[result.path]
        group_key: tuple[str, str, str] | None = None
        stem_key = (result.kind, str(identity["stem_key"]).strip())
        title_key = (result.kind, str(identity["title_key"]).strip())
        if stem_key in active_stem_groups:
            group_key = ("stem", stem_key[0], stem_key[1])
        elif title_key in active_title_groups:
            group_key = ("title", title_key[0], title_key[1])

        if group_key is None:
            deduped.append(result)
            continue

        winner = winners.get(group_key)
        if winner is None:
            winners[group_key] = result
            deduped.append(result)
            continue

        winner.suppressed_duplicates = dedupe_strings([*winner.suppressed_duplicates, repo_rel(paths, result.path)])
        winner.source_refs = dedupe_strings([*winner.source_refs, *result.source_refs])
        winner.related = dedupe_strings([*winner.related, *result.related])
        winner.industries = dedupe_strings([*winner.industries, *result.industries])
        winner.categories = dedupe_strings([*winner.categories, *result.categories])
        if winner.snippet is None and result.snippet is not None:
            winner.snippet = result.snippet

    return deduped


def query_pages(
    paths: RepoPaths,
    terms: list[str],
    phrase: str,
    kinds: set[str],
    limit: int,
    filters: QueryFilters | None = None,
    dedupe: bool = True,
) -> list[QueryResult]:
    active_filters = filters or QueryFilters(domains=set(), industries=set(), categories=set())
    results: list[QueryResult] = []
    for path in canonical_pages(paths):
        kind = canonical_kind_for_path(paths, path)
        if kind is None or kind not in kinds:
            continue
        page = load_page(paths, path)
        if not matches_query_filters(page, active_filters):
            continue
        result = query_result_for_page(paths, page, terms, phrase)
        if result is not None:
            results.append(result)
    ordered = sorted(results, key=lambda item: (-item.score, -item.match_score, item.kind, item.path.as_posix()))
    if dedupe:
        ordered = dedupe_query_results(paths, ordered)
    return ordered[:limit]


def query_payload(paths: RepoPaths, query: str, results: list[QueryResult]) -> dict[str, object]:
    return {
        "query": query,
        "results": [
            {
                "path": repo_rel(paths, result.path),
                "type": result.kind,
                "title": result.title,
                "score": result.score,
                "match_score": result.match_score,
                "matched_fields": result.matched_fields,
                "snippet": result.snippet,
                "source_refs": result.source_refs,
                "related": result.related,
                "suppressed_duplicates": result.suppressed_duplicates,
                "domain": result.domain,
                "industries": result.industries,
                "categories": result.categories,
            }
            for result in results
        ],
    }
