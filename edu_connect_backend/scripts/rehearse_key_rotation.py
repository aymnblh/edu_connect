from __future__ import annotations

import os
import sys
import tempfile
from datetime import datetime, timedelta, timezone
from pathlib import Path

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from jose import jwt


ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))


def _write_pair(directory: Path, prefix: str) -> tuple[Path, Path, str, str]:
    private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    private_pem = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    ).decode("utf-8")
    public_pem = private_key.public_key().public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo,
    ).decode("utf-8")

    private_path = directory / f"{prefix}_private_key.pem"
    public_path = directory / f"{prefix}_public_key.pem"
    private_path.write_text(private_pem, encoding="utf-8")
    public_path.write_text(public_pem, encoding="utf-8")
    return private_path, public_path, private_pem, public_pem


def main() -> int:
    with tempfile.TemporaryDirectory(prefix="educonnect-key-rotation-") as tmp:
        work_dir = Path(tmp)
        _old_private_path, _old_public_path, old_private_pem, old_public_pem = _write_pair(work_dir, "old")
        new_private_path, new_public_path, _new_private_pem, _new_public_pem = _write_pair(work_dir, "new")

        os.environ.setdefault("APP_ENV", "test")
        os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://edu_user:edu_password@127.0.0.1:5432/edu_connect")
        os.environ.setdefault("REDIS_URL", "redis://127.0.0.1:1/0")
        os.environ["PRIVATE_KEY_PATH"] = str(new_private_path)
        os.environ["PUBLIC_KEY_PATH"] = str(new_public_path)
        os.environ.setdefault("SERVER_FINGERPRINT_SALT", "key-rotation-rehearsal-salt")
        os.environ.setdefault("PLATFORM_SECRET", "key-rotation-rehearsal-secret")
        os.environ.setdefault("CORS_ORIGINS", "http://testserver")

        from app.core import security

        security.settings.previous_public_key = old_public_pem

        old_token = jwt.encode(
            {
                "sub": "rotation-previous",
                "role": "parent",
                "exp": datetime.now(timezone.utc) + timedelta(minutes=5),
            },
            old_private_pem,
            algorithm="RS256",
        )
        new_token = security.create_access_token({"sub": "rotation-current", "role": "parent"})

        old_payload = security.decode_token(old_token)
        new_payload = security.decode_token(new_token)

        assert old_payload["sub"] == "rotation-previous"
        assert new_payload["sub"] == "rotation-current"
        print("key rotation rehearsal passed")
        return 0


if __name__ == "__main__":
    raise SystemExit(main())
