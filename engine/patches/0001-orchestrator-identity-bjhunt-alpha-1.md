# Patch 0001 — Rebrand orchestrator identity to BJHUNT ALPHA 1.0

**Date:** 2026-04-18
**File:** `engine/decepticon/agents/prompts/decepticon.md`
**Reason:** Phase A++ rebrand. The orchestrator's IDENTITY block reveals the
internal codename in user-facing replies (verified live: agent answered "The
orchestrator here is **DECEPTICON**" when asked about its role). Phase B-E
(full Python rename) is parked pending arbitration on upstream merges, but
the identity block is a 9-line cosmetic change that doesn't break anything.

## Change

In the `<IDENTITY>` block:
- "You are **DECEPTICON** — the autonomous Red Team Orchestrator." →
  "You are **BJHUNT ALPHA 1.0** — the autonomous Red Team Orchestrator on
  the BJHUNT platform."
- Added a one-paragraph instruction telling the LLM not to surface the
  "Decepticon" codename in user-visible answers (the Python module names
  remain unchanged).

## Re-applying after `sync-upstream-decepticon.sh`

If the upstream prompt is rewritten, replay the diff above on the new
IDENTITY block and re-add the user-visible-naming paragraph.
