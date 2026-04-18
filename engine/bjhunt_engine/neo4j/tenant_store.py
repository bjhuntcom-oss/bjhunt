"""
Per-tenant Neo4j store with strict Cypher parameter binding.

W6 deliverable — placeholder. Real implementation will:
  - Open one Neo4j *database* per tenant (Neo4j 5+ supports multi-DB on
    Community edition: `CREATE DATABASE bjhunt_org_<short_uuid>`).
  - Wrap the upstream `decepticon.tools.research.neo4j_store` API and force
    every Cypher query through the parameter-binding driver call
    (`session.run(query, params)` — never f-string interpolation).
  - Provide a `for_org(org_id)` factory consumed by the orchestrator.
  - Refuse to start if the upstream store is detected to interpolate Cypher.
"""

from __future__ import annotations

import logging

logger = logging.getLogger(__name__)


class TenantNeo4jStore:
    """Placeholder — real wiring lands in W6."""

    def __init__(self, org_id: str) -> None:
        self.org_id = org_id
        logger.warning(
            "bjhunt_engine.neo4j.TenantNeo4jStore not yet active — "
            "engine will use upstream decepticon Neo4jStore (single-tenant)"
        )

    @classmethod
    def for_org(cls, org_id: str) -> "TenantNeo4jStore":
        return cls(org_id)
