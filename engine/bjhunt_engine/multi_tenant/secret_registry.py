"""
Per-tenant secret registry built on `openhands.sdk.SecretRegistry`.

W6 deliverable — placeholder. Real implementation will:
  - Instantiate one SecretRegistry per (org_id, engagement_id).
  - Inject secrets into the Kali sandbox as masked env vars.
  - Mask any secret value found in the SSE output stream before it reaches
    the backend SSE relay (defense against accidental disclosure).
  - Support mid-conversation rotation (admin re-issues a secret while the
    engagement is still running — old value is invalidated everywhere).
"""

from . import _require_openhands

_require_openhands("secret_registry")

# Real wiring lands in W6:
# from openhands.sdk import SecretRegistry
#
# class TenantSecretRegistry(SecretRegistry):
#     def __init__(self, org_id: str, engagement_id: str) -> None:
#         super().__init__(...)
#         self.org_id = org_id
#         self.engagement_id = engagement_id
