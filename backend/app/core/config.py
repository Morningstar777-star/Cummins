import json
from typing import Literal

from pydantic import Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


def _split_csv(value: str) -> list[str]:
    return [item.strip() for item in value.split(",") if item.strip()]


class Settings(BaseSettings):
    app_name: str = "Olive and Oak API"
    app_version: str = "1.0.0"
    app_env: Literal["development", "staging", "production", "test"] = "development"
    api_prefix: str = "/api/v1"
    enable_docs: bool = True

    secret_key: str = "change-me"
    access_token_expire_minutes: int = 60 * 24 * 7

    mongodb_uri: str
    mongodb_db_name: str = "olive_oak"
    demo_seed_enabled: bool = False
    admin_bootstrap_enabled: bool = True
    admin_bootstrap_email: str = "admin@gmail.com"
    admin_bootstrap_password: str = "Admin123"

    cors_allowed_origins: list[str] = Field(
        default_factory=lambda: [
            "http://localhost:8081",
            "http://127.0.0.1:8081",
            "http://localhost:8082",
            "http://127.0.0.1:8082",
            "http://localhost:8083",
            "http://127.0.0.1:8083",
            "http://localhost:8084",
            "http://127.0.0.1:8084",
            "http://localhost:8085",
            "http://127.0.0.1:8085",
            "http://localhost:19006",
            "http://127.0.0.1:19006",
        ]
    )
    cors_allow_origin_regex: str | None = (
        r"^https?://((localhost|127\.0\.0\.1)|(10\.\d+\.\d+\.\d+)|(192\.168\.\d+\.\d+)|(172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+))(:\d+)?$"
    )
    cors_allow_credentials: bool = True
    cors_allow_methods: list[str] = Field(default_factory=lambda: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"])
    cors_allow_headers: list[str] = Field(default_factory=lambda: ["*"])
    trusted_hosts: list[str] = Field(default_factory=lambda: ["localhost", "127.0.0.1", "*.localhost"])
    security_headers_enabled: bool = True

    groq_api_key: str = ""
    groq_model_text: str = "llama-3.1-8b-instant"
    groq_model_vision: str = "meta-llama/llama-4-scout-17b-16e-instruct"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        enable_decoding=False,
    )

    @field_validator("cors_allowed_origins", "cors_allow_methods", "cors_allow_headers", "trusted_hosts", mode="before")
    @classmethod
    def parse_list_values(cls, value):
        if isinstance(value, str):
            text = value.strip()
            if text.startswith("[") and text.endswith("]"):
                try:
                    parsed = json.loads(text)
                    if isinstance(parsed, list):
                        return [str(item).strip() for item in parsed if str(item).strip()]
                except json.JSONDecodeError:
                    pass
            return _split_csv(value)
        return value

    @model_validator(mode="after")
    def validate_security_defaults(self):
        is_production_like = self.app_env in {"production", "staging"}
        if is_production_like and (self.secret_key == "change-me" or len(self.secret_key) < 32):
            raise ValueError("SECRET_KEY must be set to a strong value (32+ chars) in staging/production.")
        if is_production_like and len(self.admin_bootstrap_password) < 10:
            raise ValueError("ADMIN_BOOTSTRAP_PASSWORD must be at least 10 characters in staging/production.")
        return self


settings = Settings()
