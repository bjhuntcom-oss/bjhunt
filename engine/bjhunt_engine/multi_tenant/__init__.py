"""
Multi-tenancy enablement layer.

Modules in this package depend on the optional `openhands` extra. Each module
imports OpenHands lazily and raises a clear error if the extra is missing.
"""


def _require_openhands(module_name: str) -> None:
    """Raise an actionable ImportError if the openhands optional extra is missing."""
    try:
        import openhands  # type: ignore[import-not-found]  # noqa: F401
    except ImportError as exc:  # pragma: no cover
        raise ImportError(
            f"bjhunt_engine.multi_tenant.{module_name} requires the 'openhands' "
            "optional extra. Install with: cd engine && uv sync --extra openhands"
        ) from exc
