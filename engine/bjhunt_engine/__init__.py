"""
bjhunt_engine — BJHUNT-side wrapper layer over the upstream Decepticon engine.

Architectural rule (D6 / D3 in the master roadmap):
    *Never edit `engine/decepticon/` upstream files.* Subclass, wrap, or compose
    them from this `bjhunt_engine` package so monthly merges of upstream stay
    conflict-free.

Sub-packages:
    - middleware/   custom middleware that runs *before* the upstream chain
                    (e.g. whitelist_command — defense-in-depth over SafeCommand)
    - multi_tenant/ multi-tenancy enablement using `openhands-sdk` primitives
                    (SecretRegistry, SecurityAnalyzer, DockerWorkspace)
    - neo4j/        per-tenant Neo4j knowledge graph store with Cypher
                    parameter-binding (closes the Neo4jStore Cypher injection
                    risk noted in docs/architecture/04-DECEPTICON-ENGINE.md)

This package is intentionally near-empty in W3. Real implementation lands
in W5 (whitelist_command), W6 (multi_tenant.secret_registry +
security_analyzer + neo4j.tenant_store), and W7 (multi_tenant.workspace_manager
+ tenant_orchestrator).
"""

__version__ = "0.0.1"
