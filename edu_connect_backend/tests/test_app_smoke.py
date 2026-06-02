import importlib
import sys

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from fastapi.testclient import TestClient


def _write_test_keys(tmp_path):
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


def test_health_endpoint_starts_without_database(monkeypatch, tmp_path):
    private_path, public_path = _write_test_keys(tmp_path)

    monkeypatch.setenv("APP_ENV", "test")
    monkeypatch.setenv(
        "DATABASE_URL",
        "postgresql+asyncpg://edu_user:edu_password@127.0.0.1:5432/edu_connect",
    )
    monkeypatch.setenv("REDIS_URL", "redis://127.0.0.1:1/0")
    monkeypatch.setenv("PRIVATE_KEY_PATH", str(private_path))
    monkeypatch.setenv("PUBLIC_KEY_PATH", str(public_path))
    monkeypatch.setenv("SERVER_FINGERPRINT_SALT", "test-fingerprint-salt")
    monkeypatch.setenv("PLATFORM_SECRET", "test-platform-secret")
    monkeypatch.setenv("CORS_ORIGINS", "http://testserver")

    for module_name in list(sys.modules):
        if module_name == "app" or module_name.startswith("app."):
            sys.modules.pop(module_name)

    app = importlib.import_module("app.main").app

    with TestClient(app) as client:
        response = client.get("/health")
        denied_metrics = client.get("/metrics")
        metrics = client.get("/metrics", headers={"X-Platform-Secret": "test-platform-secret"})

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
    assert denied_metrics.status_code == 403
    assert metrics.status_code == 200
    assert "educonnect_http_requests_total" in metrics.text
