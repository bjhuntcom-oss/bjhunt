"""Decepticon configuration — defaults + environment variable overrides.

LLM model assignments are defined in decepticon.llm.models (LLMModelMapping).
This config handles infrastructure settings: proxy connection and Docker sandbox.
"""

from __future__ import annotations

from pathlib import Path

from pydantic import BaseModel, Field
from pydantic_settings import BaseSettings

from decepticon.llm.models import ModelProfile


def _project_root() -> Path:
    """Project root (where docker-compose.yml lives)."""
    root = Path(__file__).resolve().parent.parent.parent
    if (root / "docker-compose.yml").exists():
        return root
    return Path.cwd()


class LLMConfig(BaseModel):
    """LLM proxy connection configuration.

    Two modes:
      1. LiteLLM proxy (default) — engine talks to a LiteLLM proxy that
         routes to multiple providers (Anthropic, OpenAI, Ollama Cloud,
         etc.) with fallback chains, budget caps, spend tracking.
      2. Ollama Cloud direct (``direct_ollama=True``) — engine talks
         straight to ``https://ollama.com/v1`` (OpenAI-compatible
         endpoint) using ``OLLAMA_CLOUD_API_KEY``. No fallback to
         Anthropic/OpenAI, only models reachable via Ollama Cloud
         (glm-5.1, kimi-k2.5, deepseek-v3.2 etc.).
         Toggle: ``BJHUNT_LLM__DIRECT_OLLAMA=true``.
    """

    proxy_url: str = "http://localhost:4000"
    proxy_api_key: str = ""  # REQUIRED — set via BJHUNT_LLM__PROXY_API_KEY env var
    timeout: int = 120
    max_retries: int = 2
    direct_ollama: bool = False  # set via BJHUNT_LLM__DIRECT_OLLAMA=true


class DockerConfig(BaseModel):
    """Docker sandbox configuration.

    Runtime tuning knobs for the tmux-backed bash tool can be overridden via
    nested env vars, e.g. ``BJHUNT_DOCKER__POLL_INTERVAL=0.25``.
    """

    sandbox_container_name: str = "bjhunt-sandbox"
    sandbox_image: str = "bjhunt-sandbox:latest"
    network: str = "bjhunt-net"

    # ── tmux session behavior ──
    poll_interval: float = Field(0.5, gt=0.0, description="Seconds between capture-pane polls")
    stall_seconds: float = Field(
        3.0, gt=0.0, description="Seconds of no screen change → treat as interactive prompt"
    )
    max_output_chars: int = Field(
        30_000, gt=0, description="Truncate command output larger than this"
    )
    auto_background_seconds: float = Field(
        60.0, gt=0.0, description="Auto-background a blocking command after this many seconds"
    )
    size_watchdog_chars: int = Field(
        5_000_000, gt=0, description="Force-kill commands producing more than this many chars"
    )
    size_watchdog_interval: float = Field(
        5.0, gt=0.0, description="Seconds between size watchdog checks"
    )


class BjhuntConfig(BaseSettings):
    """Root configuration.

    Set BJHUNT_MODEL_PROFILE to switch model presets:
      eco  — Balanced Anthropic-first (production)
      max  — Opus everywhere (high-value targets)
      test — Haiku-only (development/CI, $1/$5 per MTok)
    """

    model_config = {"env_prefix": "BJHUNT_", "env_nested_delimiter": "__"}

    debug: bool = False
    model_profile: ModelProfile = ModelProfile.ECO
    llm: LLMConfig = Field(default_factory=LLMConfig)
    docker: DockerConfig = Field(default_factory=DockerConfig)


def load_config() -> BjhuntConfig:
    """Load config from code defaults + environment variable overrides."""
    return BjhuntConfig()
