"""
Whitelist-based command validator. Runs BEFORE decepticon.middleware.SafeCommand.

W5 deliverable — placeholder. The real implementation will:
  - Maintain an explicit allow-list of binaries (nmap, nuclei, sqlmap, hydra,
    masscan, curl, wget, dig, host, whois, cat, grep, find, ls, python3, pip,
    git, tmux, screen — per docs/architecture/14-SECURITY.md §10).
  - Block command substitution `$(...)`, backticks, `${VAR:0:1}`, IFS abuse,
    base64 piping into shell.
  - Log every command (allowed or blocked) to `audit_logs` table via
    backend HTTP callback (or stderr → backend log shipper).
  - Run in chain BEFORE upstream SafeCommand so the upstream blacklist becomes
    a defense-in-depth fallback, not the primary gate.

For now this file exists to lock the import path. Importing it succeeds; calling
the validator currently delegates to upstream SafeCommand only.
"""

from __future__ import annotations

import logging

logger = logging.getLogger(__name__)


def validate_command(_command: str) -> bool:
    """
    NOT YET IMPLEMENTED — raises immediately to prevent silent false-pass.

    Per DOC-03 audit (2026-04-18): a placeholder returning ``True`` would
    create a dangerous "false sense of security" — callers might assume the
    whitelist is active and skip their own validation.

    The real whitelist lands in W5. Until then, callers should NOT import
    `bjhunt_engine.middleware.whitelist_command` from any code path that
    actually needs validation. The upstream `decepticon.middleware.SafeCommand`
    (blacklist-based) remains the only enforcer in the chain.
    """
    raise NotImplementedError(
        "bjhunt_engine.middleware.whitelist_command is a W5 deliverable and "
        "is not yet implemented. Use decepticon.middleware.SafeCommand for now "
        "and do NOT rely on this stub for any command validation."
    )
