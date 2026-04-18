"""
Tenant-aware wrapper over `decepticon/orchestrator.py`.

W7 deliverable — placeholder. Real implementation will:
  - Compose decepticon.orchestrator with a tenant-bound execution context
    (workspace + secret_registry + security_analyzer + per-tenant Neo4j db).
  - Never edit upstream orchestrator.py — subclass / wrap only.
  - Expose a `start_engagement(org_id, engagement_id, target, scope, roe)`
    coroutine consumed by the backend job worker (BullMQ → LangGraph).
"""

from . import _require_openhands

_require_openhands("tenant_orchestrator")

# Real wiring lands in W7:
# from decepticon.orchestrator import build_orchestrator
# from .workspace_manager import create_workspace_for_engagement
# from .secret_registry import TenantSecretRegistry
# from .security_analyzer import PentestSecurityAnalyzer
# from ..neo4j.tenant_store import TenantNeo4jStore
#
# async def start_engagement(org_id, engagement_id, target, scope, roe):
#     ...
