"""Unit tests for decepticon.core.config"""

from decepticon.core.config import BjhuntConfig, load_config


class TestBjhuntConfig:
    def test_default_values(self):
        config = BjhuntConfig()
        assert config.debug is False

    def test_llm_defaults(self):
        config = BjhuntConfig()
        assert config.llm.proxy_url == "http://localhost:4000"
        assert config.llm.proxy_api_key == ""  # No default key — must be set via env

    def test_env_override(self, monkeypatch):
        monkeypatch.setenv("BJHUNT_DEBUG", "true")
        config = BjhuntConfig()
        assert config.debug is True


class TestLoadConfig:
    def test_returns_defaults(self):
        config = load_config()
        assert config.llm.proxy_url == "http://localhost:4000"
        assert config.docker.sandbox_container_name == "bjhunt-sandbox"
