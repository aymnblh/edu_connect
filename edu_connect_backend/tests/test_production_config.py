import os
import subprocess
import sys
from pathlib import Path

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa


ROOT = Path(__file__).resolve().parents[1]


def _write_keys(tmp_path: Path) -> tuple[Path, Path]:
    private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    private_path = tmp_path / "private_key.pem"
    public_path = tmp_path / "public_key.pem"
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
    return private_path, public_path


def _production_env(tmp_path: Path, **overrides: str) -> dict[str, str]:
    private_path, public_path = _write_keys(tmp_path)
    env = os.environ.copy()
    env.update(
        {
            "APP_ENV": "production",
            "DATABASE_URL": "postgresql+asyncpg://edu_app:strong_password@127.0.0.1:5432/edu_connect",
            "REDIS_URL": "redis://127.0.0.1:1/0",
            "PRIVATE_KEY_PATH": str(private_path),
            "PUBLIC_KEY_PATH": str(public_path),
            "SERVER_FINGERPRINT_SALT": "prod-fingerprint-salt-with-32-chars",
            "PLATFORM_SECRET": "prod-platform-secret-with-32-chars",
            "CORS_ORIGINS": "https://app.example.test",
            "CREATE_TABLES_ON_STARTUP": "false",
            "MEDIA_MALWARE_SCAN_ENABLED": "true",
            "MEDIA_MALWARE_SCAN_REQUIRED": "true",
            "NTFY_AUTH_TOKEN": "prod-ntfy-token-with-32-chars",
        }
    )
    env.update(overrides)
    return env


def _import_config(env: dict[str, str]) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [sys.executable, "-c", "import app.core.config; print('ok')"],
        cwd=ROOT,
        env=env,
        text=True,
        capture_output=True,
        timeout=20,
    )


def test_production_config_accepts_strict_settings(tmp_path):
    result = _import_config(_production_env(tmp_path))

    assert result.returncode == 0
    assert "ok" in result.stdout


def test_production_config_accepts_uploads_disabled_without_scanner(tmp_path):
    result = _import_config(
        _production_env(
            tmp_path,
            MEDIA_UPLOADS_ENABLED="false",
            MEDIA_MALWARE_SCAN_ENABLED="false",
            MEDIA_MALWARE_SCAN_REQUIRED="false",
        )
    )

    assert result.returncode == 0
    assert "ok" in result.stdout


def test_production_config_rejects_uploads_enabled_without_required_scanner(tmp_path):
    result = _import_config(
        _production_env(
            tmp_path,
            MEDIA_UPLOADS_ENABLED="true",
            MEDIA_MALWARE_SCAN_ENABLED="false",
            MEDIA_MALWARE_SCAN_REQUIRED="false",
        )
    )

    assert result.returncode != 0
    assert "Media malware scanning" in result.stderr


def test_production_config_rejects_wildcard_cors(tmp_path):
    result = _import_config(_production_env(tmp_path, CORS_ORIGINS="*"))

    assert result.returncode != 0
    assert "CORS_ORIGINS" in result.stderr


def test_production_config_rejects_missing_previous_rotation_key(tmp_path):
    result = _import_config(
        _production_env(
            tmp_path,
            PREVIOUS_PUBLIC_KEY_PATH=str(tmp_path / "missing_previous_public_key.pem"),
        )
    )

    assert result.returncode != 0
    assert "Previous public key path" in result.stderr
