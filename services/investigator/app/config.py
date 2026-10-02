from functools import lru_cache
from pathlib import Path

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


SERVICE_ROOT = Path(__file__).resolve().parents[1]


class Settings(BaseSettings):
    app_name: str = "RootWatch Investigator"
    app_env: str = "development"
    host: str = "0.0.0.0"
    port: int = 8001
    incident_provider: str = "mock"
    monitoring_api_url: str = "http://localhost:8000/api/v1"
    mock_incident_path: Path = Path("mock_data/incident-context.json")
    source_root: Path = Path("demo_repository")
    use_llm: bool = True
    llm_required: bool = False
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "qwen2.5:3b"
    llm_timeout_seconds: float = 45.0
    cors_origins: str = "http://localhost:5173"

    model_config = SettingsConfigDict(
        env_file=SERVICE_ROOT / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @field_validator("incident_provider")
    @classmethod
    def validate_provider(cls, value: str) -> str:
        normalized = value.lower().strip()
        if normalized not in {"mock", "api"}:
            raise ValueError("INCIDENT_PROVIDER must be mock or api")
        return normalized

    @field_validator("mock_incident_path", "source_root")
    @classmethod
    def resolve_service_path(cls, value: Path) -> Path:
        return value if value.is_absolute() else SERVICE_ROOT / value

    @property
    def cors_origin_list(self) -> list[str]:
        return [item.strip() for item in self.cors_origins.split(",") if item.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
