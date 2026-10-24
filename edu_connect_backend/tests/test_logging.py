import json
import logging

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.core.logging_config import (
    JsonFormatter,
    RedactingFilter,
    RequestLoggingMiddleware,
    redact,
    request_id_var,
)


def test_secrets_are_redacted():
    line = (
        'login payload {"email": "a@b.dz", "password": "Hunter22!", "refresh_token": "abc.def"} '
        "Authorization: Bearer eyJhbGciOi.eyJzdWIiOiJ4In0.c2lnbmF0dXJl invite_code=XYZ123 pin=123456"
    )
    cleaned = redact(line)
    for secret in ("Hunter22!", "abc.def", "eyJhbGciOi", "XYZ123", "123456"):
        assert secret not in cleaned
    assert "a@b.dz" in cleaned
    assert "[REDACTED]" in cleaned


def _record(message, *args, exc_info=None):
    return logging.LogRecord("test", logging.ERROR, __file__, 1, message, args, exc_info)


def test_json_lines_carry_request_id_and_redact_exceptions():
    token = request_id_var.set("req-12345678")
    try:
        try:
            raise ValueError("bad token=eyJabcdef.eyJabcdef.sigabcdef")
        except ValueError:
            import sys

            record = _record("failed for %s", "password=secret1", exc_info=sys.exc_info())
        assert RedactingFilter().filter(record)
        payload = json.loads(JsonFormatter().format(record))
    finally:
        request_id_var.reset(token)

    assert payload["request_id"] == "req-12345678"
    assert payload["level"] == "ERROR"
    assert "secret1" not in payload["message"]
    assert "eyJabcdef" not in payload["exception"]


def _app():
    app = FastAPI()
    app.add_middleware(RequestLoggingMiddleware)

    @app.get("/ping")
    async def ping():
        return {"request_id": request_id_var.get()}

    return app


def test_request_id_is_returned_and_unsafe_ids_are_replaced(caplog):
    client = TestClient(_app())
    with caplog.at_level(logging.INFO, logger="educonnect.access"):
        ok = client.get("/ping?code=SECRET99", headers={"X-Request-ID": "client-req-0001"})
        bad = client.get("/ping", headers={"X-Request-ID": "bad id\nwith newline"})

    assert ok.headers["X-Request-ID"] == "client-req-0001"
    assert ok.json()["request_id"] == "client-req-0001"
    assert bad.headers["X-Request-ID"] != "bad id\nwith newline"
    assert len(bad.headers["X-Request-ID"]) == 32

    access = [r for r in caplog.records if r.name == "educonnect.access"]
    assert len(access) == 2
    assert access[0].path == "/ping" and access[0].status == 200
    assert all("SECRET99" not in r.getMessage() for r in access)
