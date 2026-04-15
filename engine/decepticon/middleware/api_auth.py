"""API authentication middleware for LangGraph API.

Validates Bearer tokens on all incoming requests to the LangGraph API
(port 2024). Tokens are checked against the BJHUNT_API_SECRET env var.

This prevents unauthorized access to the agent orchestration API.
Only the BJHUNT backend (Hono+Bun) should have the API secret.

Usage in langgraph.json:
    "auth": {
        "path": "./decepticon/middleware/api_auth.py:auth_handler"
    }
"""

from __future__ import annotations

import hmac
import os

from langgraph_sdk.auth import Auth

# The shared secret between BJHUNT backend and LangGraph API.
# Set via BJHUNT_API_SECRET env var — required in production.
_API_SECRET = os.environ.get("BJHUNT_API_SECRET", "")

auth = Auth()


@auth.authenticate
async def auth_handler(authorization: str | None = None) -> dict:
    """Validate Bearer token from the Authorization header.

    Args:
        authorization: The Authorization header value (e.g. "Bearer <token>").

    Returns:
        A dict with the authenticated identity on success.

    Raises:
        Auth.exceptions.HTTPException: If the token is missing or invalid.
    """
    if not _API_SECRET:
        raise auth.exceptions.HTTPException(
            status_code=500,
            detail="Server misconfigured: BJHUNT_API_SECRET not set",
        )

    if not authorization:
        raise auth.exceptions.HTTPException(
            status_code=401,
            detail="Missing Authorization header",
        )

    parts = authorization.split(" ", 1)
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise auth.exceptions.HTTPException(
            status_code=401,
            detail="Invalid Authorization header format — expected 'Bearer <token>'",
        )

    token = parts[1]
    if not hmac.compare_digest(token, _API_SECRET):
        raise auth.exceptions.HTTPException(
            status_code=403,
            detail="Invalid API token",
        )

    return {"identity": "bjhunt-backend", "is_authenticated": True}
