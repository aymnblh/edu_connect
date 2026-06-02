import os
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


def _looks_like_placeholder(value: str) -> bool:
    normalized = value.strip().lower()
    return (
        not normalized
        or normalized.startswith("replace_with")
        or normalized.startswith("your_")
        or normalized.startswith("change-this")
        or normalized in {"test-platform-secret", "test-fingerprint-salt"}
    )

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env")

    app_env: str = "development"
    database_url: str
    redis_url: str = "redis://localhost:6379/0"
    private_key_path: str = "secrets/private_key.pem"
    public_key_path: str = "secrets/public_key.pem"
    previous_public_key_path: str | None = None
    server_fingerprint_salt: str
    jwt_algorithm: str = "RS256"
    platform_secret: str
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 30
    max_active_session_families: int = 5
    audit_retention_days: int = 2555
    security_alert_status_codes: str = "401,403,429"
    security_alert_threshold: int = 10
    security_alert_window_seconds: int = 300
    security_alert_cooldown_seconds: int = 900

    # Production hardening
    cors_origins: str = ""
    create_tables_on_startup: bool = False
    
    # Local/private push notifications via ntfy
    ntfy_base_url: str = ""
    ntfy_auth_token: str = ""
    ntfy_topic_prefix: str = "educonnect"
    media_storage_path: str = "media/attachments"
    media_max_upload_bytes: int = 10 * 1024 * 1024
    media_malware_scan_enabled: bool = False
    media_malware_scan_required: bool = False
    clamav_host: str = "clamav"
    clamav_port: int = 3310
    clamav_timeout_seconds: float = 15.0

    # In-memory keys (loaded at startup)
    private_key: str = ""
    public_key: str = ""
    previous_public_key: str | None = None

    @field_validator("database_url")
    @classmethod
    def normalize_async_database_url(cls, value: str) -> str:
        if value.startswith("postgresql://"):
            return value.replace("postgresql://", "postgresql+asyncpg://", 1)
        return value

    @property
    def is_production(self) -> bool:
        return self.app_env.lower() in {"prod", "production"}

    @property
    def allowed_cors_origins(self) -> list[str]:
        if self.cors_origins.strip():
            return [
                origin.strip()
                for origin in self.cors_origins.split(",")
                if origin.strip()
            ]
        if self.is_production:
            return []
        return [
            "http://localhost",
            "http://localhost:3000",
            "http://localhost:5173",
            "http://127.0.0.1:3000",
            "http://127.0.0.1:5173",
        ]

    @property
    def security_alert_codes(self) -> set[int]:
        codes: set[int] = set()
        for value in self.security_alert_status_codes.split(","):
            value = value.strip()
            if not value:
                continue
            try:
                codes.add(int(value))
            except ValueError:
                continue
        return codes

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self._load_keys()
        self._validate_production_settings()

    def _load_keys(self):
        """Load RSA keys from disk once. Fail fast if missing."""
        if self.private_key and self.public_key:
            self.private_key = self.private_key.replace("\\n", "\n")
            self.public_key = self.public_key.replace("\\n", "\n")
            if self.previous_public_key:
                self.previous_public_key = self.previous_public_key.replace("\\n", "\n")
            return

        if not os.path.exists(self.private_key_path) or not os.path.exists(self.public_key_path):
            raise RuntimeError(
                f"FATAL: RSA keys missing at {self.private_key_path} or {self.public_key_path}. "
                "Run 'python manage.py generate-keys' once before starting the server."
            )
        
        with open(self.private_key_path, "r") as f:
            self.private_key = f.read()
        
        with open(self.public_key_path, "r") as f:
            self.public_key = f.read()

        if self.previous_public_key_path and os.path.exists(self.previous_public_key_path):
            with open(self.previous_public_key_path, "r") as f:
                self.previous_public_key = f.read()
        elif self.previous_public_key_path and self.is_production:
            raise RuntimeError(
                f"FATAL: Previous public key path is configured but missing: {self.previous_public_key_path}"
            )

    def _validate_production_settings(self):
        if not self.is_production:
            return

        errors: list[str] = []
        if self.jwt_algorithm != "RS256":
            errors.append("JWT_ALGORITHM must be RS256")
        if self.create_tables_on_startup:
            errors.append("CREATE_TABLES_ON_STARTUP must be false")
        if not self.cors_origins.strip():
            errors.append("CORS_ORIGINS must list approved HTTPS origins")

        for origin in self.allowed_cors_origins:
            lowered = origin.lower()
            if origin == "*" or "localhost" in lowered or "127.0.0.1" in lowered:
                errors.append("CORS_ORIGINS cannot include wildcard or local origins")
            if not lowered.startswith("https://"):
                errors.append("CORS_ORIGINS must use HTTPS origins")

        if len(self.platform_secret) < 32 or _looks_like_placeholder(self.platform_secret):
            errors.append("PLATFORM_SECRET must be a strong production secret")
        if len(self.server_fingerprint_salt) < 32 or _looks_like_placeholder(self.server_fingerprint_salt):
            errors.append("SERVER_FINGERPRINT_SALT must be a strong production salt")
        if self.ntfy_auth_token and _looks_like_placeholder(self.ntfy_auth_token):
            errors.append("NTFY_AUTH_TOKEN must be replaced")
        if not self.media_malware_scan_enabled or not self.media_malware_scan_required:
            errors.append("Media malware scanning must be enabled and required")
        if self.previous_public_key and self.previous_public_key == self.public_key:
            errors.append("PREVIOUS_PUBLIC_KEY_PATH must not point at the current public key")

        if errors:
            raise RuntimeError("Production configuration invalid: " + "; ".join(sorted(set(errors))))

settings = Settings()
