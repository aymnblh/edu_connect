import os
from pathlib import Path

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa


def pytest_configure():
    key_dir = Path(__file__).parent / ".test_keys"
    key_dir.mkdir(exist_ok=True)
    private_path = key_dir / "private_key.pem"
    public_path = key_dir / "public_key.pem"

    if not private_path.exists() or not public_path.exists():
        private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
        private_path.write_bytes(
            private_key.private_bytes(
                encoding=serialization.Encoding.PEM,
                format=serialization.PrivateFormat.PKCS8,
                encryption_algorithm=serialization.NoEncryption(),
            )
        )
        public_path.write_bytes(
            private_key.public_key().public_bytes(
                encoding=serialization.Encoding.PEM,
                format=serialization.PublicFormat.SubjectPublicKeyInfo,
            )
        )

    os.environ.setdefault("APP_ENV", "test")
    os.environ.setdefault(
        "DATABASE_URL",
        "postgresql+asyncpg://edu_user:edu_password@127.0.0.1:5432/edu_connect",
    )
    os.environ.setdefault("REDIS_URL", "redis://127.0.0.1:1/0")
    os.environ.setdefault("PRIVATE_KEY_PATH", str(private_path))
    os.environ.setdefault("PUBLIC_KEY_PATH", str(public_path))
    os.environ.setdefault("SERVER_FINGERPRINT_SALT", "test-fingerprint-salt")
    os.environ.setdefault("PLATFORM_SECRET", "test-platform-secret")
    os.environ.setdefault("CORS_ORIGINS", "http://testserver")
