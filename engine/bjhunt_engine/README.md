# bjhunt_engine

BJHUNT-side wrapper layer over the upstream `decepticon/` engine.

## Why

The upstream `engine/decepticon/` lives in the same repo for ergonomics, but it
is treated as **vendored** code: we never edit it. We pull `upstream/main`
monthly via the merge cadence documented in `docs/architecture/04-DECEPTICON-ENGINE.md`.

Anything BJHUNT-specific (multi-tenancy, OpenHands embedding, hardened
middleware, per-tenant Neo4j) lives in this `bjhunt_engine/` package and
**composes** the upstream code via subclassing, decorators, or middleware
insertion *before* the upstream chain.

## Layout

```
bjhunt_engine/
├── __init__.py
├── README.md                       (this file)
│
├── middleware/                     W5 deliverable
│   └── whitelist_command.py        Whitelist-based command validator that
│                                   runs BEFORE decepticon SafeCommand.
│                                   Closes H1 + M1 from doc 04.
│
├── multi_tenant/                   W6 + W7 deliverable
│   ├── secret_registry.py          Wraps openhands.sdk.SecretRegistry —
│   │                               per-tenant secret isolation, output
│   │                               masking on the SSE stream.
│   ├── security_analyzer.py        Wraps openhands.sdk.SecurityAnalyzer +
│   │                               ConfirmationPolicy with risk thresholds
│   │                               adapted to pentest (nmap=LOW, exploit=HIGH).
│   ├── workspace_manager.py        Wraps openhands.workspace.DockerWorkspace
│   │                               for per-tenant Kali sandbox lifecycle.
│   └── tenant_orchestrator.py      Wraps decepticon orchestrator.py —
│                                   parameterizes sandbox + Neo4j-DB by tenant.
│
└── neo4j/                          W6 deliverable
    └── tenant_store.py              Per-tenant Neo4j database with strict
                                     Cypher parameter binding (closes the
                                     Cypher injection risk on Neo4jStore).
```

## OpenHands extras

OpenHands SDK packages are an **optional** install:

```bash
cd engine
uv sync --extra openhands     # only when working on multi_tenant/
```

Without the extra installed, importing from `bjhunt_engine.multi_tenant.*`
raises a clear ImportError with the install instruction. This keeps the base
engine working without pulling ~200 MB of OpenHands deps.

## Decision log reference

- D3 (Engine pattern : `bjhunt_engine/` wraps `decepticon/`)
- D4 (OpenHands embedding scope: 3/4 packages)
- D5 (Mapping conceptuel "1 engagement BJHUNT = 1 OpenHands workspace longue durée")
- D6 (No upstream rename — branding wrapper at presentation layer)
- D7 (Strategy upstream merge — monthly cadence)
