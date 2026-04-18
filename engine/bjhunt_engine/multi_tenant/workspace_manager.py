"""
Per-tenant Kali sandbox lifecycle via `openhands.workspace.DockerWorkspace`.

W7 deliverable — placeholder. Real implementation will:
  - spawn one DockerWorkspace per engagement with hardened defaults (per
    docs/architecture/14-SECURITY.md §Sandbox Isolation):
        image           = bjhunt/kali-sandbox:latest
        memory          = 2g
        cpu             = 2
        network         = bjhunt-sandbox-{tenant_short}
        cap_drop        = ALL
        cap_add         = [NET_RAW, NET_ADMIN]
        no_new_privileges = True
  - track engagement_id ↔ workspace_id mapping in Postgres (engagements.workspace_id)
  - apply idle timeouts per plan tier (Free 5min / Starter 2h / Pro 4h / Ent 4h)
  - destroy workspace + cleanup on engagement completion or timeout
"""

from . import _require_openhands

_require_openhands("workspace_manager")

# Real wiring lands in W7:
# from openhands.workspace import DockerWorkspace
#
# def create_workspace_for_engagement(org_id: str, engagement_id: str, plan: str) -> DockerWorkspace:
#     ...
