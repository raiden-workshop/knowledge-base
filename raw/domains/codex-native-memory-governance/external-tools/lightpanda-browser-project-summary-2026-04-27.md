# Lightpanda Browser Project Summary Snapshot

Source date: 2026-04-27
Source URL: https://github.com/lightpanda-io/browser
Homepage: https://lightpanda.io

## Repository Metadata

- Repository: `lightpanda-io/browser`
- Description: `Lightpanda: the headless browser designed for AI and automation`
- Created: 2023-02-07
- Last observed push: 2026-04-27T07:02:27Z
- Default branch: `main`
- Topics: `browser`, `browser-automation`, `cdp`, `headless`, `playwright`, `puppeteer`, `zig`
- Observed stars: 29,460
- Observed forks: 1,272
- Observed open issues: 101
- License: AGPL-3.0 / `AGPL-3.0-only` per repository metadata and `LICENSING.md`

## Project Positioning

Lightpanda Browser is an open-source headless browser built from scratch for AI agents and automation. The project explicitly positions itself as a new browser written in Zig rather than a Chromium fork or WebKit patch.

Its primary value proposition is lower memory use and faster execution for browser automation and crawling workloads. The README benchmark claims 123 MB peak memory for 100 pages and 5 seconds execution time, compared with 2 GB and 46 seconds for Headless Chrome in the linked benchmark scenario.

## Capability Summary

- Headless browser runtime for automation and AI-agent browsing.
- Chrome DevTools Protocol / websocket server so existing Puppeteer-style clients can connect.
- Direct URL fetch and DOM dump, including markdown dump mode.
- JavaScript support through V8.
- HTML parsing, DOM tree, DOM APIs, XHR/fetch, cookies, headers, proxy support, network interception, click/input support.
- Optional `robots.txt` respect through an `--obey-robots` option.
- Native MCP server mode and a related agent skill repository are mentioned by the project.

## Current Maturity And Limits

The project marks itself as Beta and work in progress. The README says stability and website coverage are improving, but users may still hit errors or crashes.

The status list shows many core browser automation features implemented, but CORS is still unchecked. The README also notes that browser Web API coverage is large and will expand over time.

## Relevance To This Knowledge Base

Lightpanda is relevant as an external tool reference for AI-agent browsing, crawling, and web-to-markdown extraction workflows. It is not a memory system and should not be treated as part of the current Codex-native memory-governance baseline.

This snapshot intentionally keeps only project summary information. It does not preserve deployment, install, build, or local setup instructions.
