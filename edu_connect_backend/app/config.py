import os
from pydantic_settings import BaseSettings
from pydantic import Field

class Settings(BaseSettings):
    database_url: str
    private_key_path: str = "secrets/private_key.pem"
    public_key_path: str = "secrets/public_key.pem"
    previous_public_key_path: str | None = None
    server_fingerprint_salt: str
    jwt_algorithm: str = "RS256"
    platform_secret: str
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 30
    
    # ntfy configuration
    ntfy_base_url: str
    ntfy_auth_token: str
    ntfy_topic_prefix: str = "educonnect"

    # In-memory keys (loaded at startup)
    private_key: str = ""
    public_key: str = ""
    previous_public_key: str | None = None

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self._load_keys()

    def _load_keys(self):
        """Load RSA keys from disk once. Fail fast if missing."""
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

    class Config:
        env_file = ".env"

settings = Settings()
