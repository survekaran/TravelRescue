from pathlib import Path

from pydantic import Field, SecretStr, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Configuration loaded from environment variables or backend/.env."""

    model_config = SettingsConfigDict(
        env_file=Path(__file__).resolve().parents[2] / ".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    DATABASE_URL: str
    JWT_SECRET_KEY: SecretStr
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(default=60, ge=5, le=1_440)
    AVIATIONSTACK_API_KEY: SecretStr | None = None

    DEBUG: bool = False
    ENABLE_DOCS: bool = False
    CORS_ORIGINS: list[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]
    TRUSTED_PROXY_CIDRS: list[str] = []
    ENABLE_HTTPS: bool = False
    MAX_REQUEST_BODY_BYTES: int = Field(default=1_048_576, ge=1_024, le=10_485_760)

    RATE_LIMIT_MAX: int = Field(default=5, ge=1, le=1_000)
    RATE_LIMIT_WINDOW: int = Field(default=900, ge=1, le=86_400)

    @field_validator("DEBUG", mode="before")
    @classmethod
    def parse_debug(cls, value: bool | str) -> bool | str:
        if isinstance(value, str) and value.lower() in {"release", "production", "prod"}:
            return False
        return value

    @field_validator("JWT_SECRET_KEY")
    @classmethod
    def jwt_secret_is_strong(cls, value: SecretStr) -> SecretStr:
        secret = value.get_secret_value()
        if len(secret) < 32:
            raise ValueError("JWT_SECRET_KEY must be at least 32 characters long")
        if secret.lower() in {
            "travelrescue-change-this-secret-key",
            "change-me",
            "changeme",
            "secret",
        }:
            raise ValueError("JWT_SECRET_KEY must be replaced with a random secret")
        return value

    @field_validator("JWT_ALGORITHM")
    @classmethod
    def jwt_algorithm_is_allowed(cls, value: str) -> str:
        if value != "HS256":
            raise ValueError("Only HS256 is supported by this deployment")
        return value

    @field_validator("CORS_ORIGINS")
    @classmethod
    def validate_cors_origins(cls, values: list[str]) -> list[str]:
        cleaned = [value.rstrip("/") for value in values if value.strip()]
        if not cleaned:
            raise ValueError("CORS_ORIGINS must contain at least one explicit origin")
        if "*" in cleaned:
            raise ValueError("Wildcard CORS origin is not allowed")
        return list(dict.fromkeys(cleaned))


settings = Settings()
