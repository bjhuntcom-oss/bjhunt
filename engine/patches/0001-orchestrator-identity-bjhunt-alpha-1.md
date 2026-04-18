# Patch 0001 — Rebrand all agent prompt identities to BJHUNT (Phase A++)

**Date:** 2026-04-18
**Files (all in `engine/decepticon/agents/prompts/`):**
- `decepticon.md`
- `ad_operator.md`, `analyst.md`, `cloud_hunter.md`, `contract_auditor.md`,
  `defender.md`, `detector.md`, `exploit.md`, `exploiter.md`, `patcher.md`,
  `planning.md`, `postexploit.md`, `recon.md`, `reverser.md`, `scanner.md`,
  `skills.md`, `soundwave.md`, `verifier.md`, `vulnresearch.md`

**Reason:** Phase A++ rebrand. The orchestrator + all sub-agents leaked the
internal codename "Decepticon" in user-facing replies (verified live: agent
answered "I'm DECEPTICON…" / "the Decepticon Cloud Hunter…"). Phase B-E (full
Python rename) is parked pending arbitration on upstream merges, but the
prompt files are runtime-only LLM context — changing them does not affect
imports, agent registration in `langgraph.json`, or any Python identifier.

## Change

`sed -i 's/Decepticon/BJHUNT/g; s/DECEPTICON/BJHUNT/g'` over every `.md` in
the prompts directory. Plus a custom paragraph in `decepticon.md` telling
the orchestrator that the internal Python module names are an implementation
detail and should not surface in user replies.

Internal Python identifiers (the `decepticon` package, `decepticon.agents.*`
modules, the `"decepticon"` graph_id key in `engine/langgraph.json`, the
`name="decepticon"` in `decepticon.py`) are intentionally left untouched.

## Re-applying after `sync-upstream-decepticon.sh`

After the script overwrites the upstream prompts:

```bash
cd engine/decepticon/agents/prompts
sed -i 's/Decepticon/BJHUNT/g; s/DECEPTICON/BJHUNT/g' *.md
```

Then verify with `grep -lE 'Decepticon|DECEPTICON' *.md` — expect no output.
Re-add the custom orchestrator paragraph from this patch into the
`<IDENTITY>` block of `decepticon.md` (the one starting with "When users ask
who you are…").
