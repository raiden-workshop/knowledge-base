---
title: "Codex 的自我进化：用 Automations 反思并改进 Skills"
type: source
status: active
created_at: 2026-04-27
updated_at: 2026-04-27
source_refs:
  - ../../raw/domains/codex-native-memory-governance/ingest/20260427T105529703227-https-www-xiaoho-78d90c7c/69df989a000000002103b986.html
  - ../../raw/domains/codex-native-memory-governance/ingest/20260427T105529703227-https-www-xiaoho-78d90c7c/extracted.md
related:
  - ../concepts/concept-codex-native-memory-governance.md
  - ../syntheses/synthesis-codex-native-memory-governance-baseline.md
domain: codex-native-memory-governance
industries:
  - ai
categories:
  - reference
  - workflow
---

# Codex 的自我进化：用 Automations 反思并改进 Skills

## Source Snapshot

- Source kind: `url`
- Source locator: `https://www.xiaohongshu.com/explore/69df989a000000002103b986?app_platform=ios&app_version=9.25&share_from_user_hidden=true&xsec_source=app_share&type=normal&xsec_token=CBbvVyDcVQuf3fI50BmRRS2dh7eD1GgLQoaUTAn16Zdw8=&author_share=1&xhsshare=WeixinSession&shareRedId=N0g7NUhIPU43Pzs7OTwwNjY0QDc0NUhK&apptime=1776285468&share_id=0e8e076777db486eba838d33b350345a`
- Author: `JoOo0oOo | Ai进化论`
- Published: `2026-04-15`
- Content hash: `78d90c7c296d`
- Draft relation type: `new`

## Why It Matters

This source gives a lightweight operating pattern for Codex self-improvement: schedule a recurring Codex Automation that reviews recent session files and updates personal skills when repeated issues or reusable workflows appear.

The article is directly relevant to this domain because it treats self-improving agents as a governance loop around observed work traces, not as a separate memory backend.

## Key Claims

- Codex App's Automation feature can be used to run a scheduled reflection loop over recent `~/.codex/sessions` files.
- The proposed prompt asks Codex to update personal skills only when recent sessions show repeated skill friction or reusable workflows.
- The article frames this as a core mechanism behind self-improving agents: observe work history, detect recurring patterns, and improve the skill layer.
- The recommended setup is to create a Codex Automation in an empty or existing project, paste the reflection prompt, choose a capable model, and schedule it outside normal work hours while the computer is on.
- Permission settings matter: if Codex is not configured for fully allowed or auto-reviewed execution, the user may need to confirm permissions when the automation runs.

## Operational Pattern

Use an automation prompt that scans the past day's Codex session files, looks for issues with personal skills, updates personal skills only when justified, and reports whether anything changed.

Keep the scope narrow:

- Personal skills only
- No repository skills
- No forced updates when there is no clear reason
- Save repeated workflows as skills only when they would speed up future work

## Related Pages

- [Codex-native memory governance](../concepts/concept-codex-native-memory-governance.md)
- [Codex-native memory governance baseline](../syntheses/synthesis-codex-native-memory-governance-baseline.md)
