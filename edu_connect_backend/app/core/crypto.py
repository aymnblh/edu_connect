"""Encryption at rest for sensitive columns (health records).

Values are stored as ``enc:v1:<Fernet token>`` so a database dump or backup
alone does not reveal them. The key comes from HEALTH_DATA_KEY (required in
production); HEALTH_DATA_PREVIOUS_KEYS lets the key be rotated without losing
older rows. Rows written before encryption existed are read as they are and
encrypted the next time they are saved.
"""
import base64
import hashlib
import json
from functools import lru_cache

from cryptography.fernet import Fernet, InvalidToken, MultiFernet
from sqlalchemy import Text
from sqlalchemy.types import TypeDecorator

from app.core.config import settings

PREFIX = "enc:v1:"
# Development and tests only; production refuses to start without a real key.
_DEV_KEY = base64.urlsafe_b64encode(hashlib.sha256(b"wasel-edu-development-health-key").digest())


@lru_cache(maxsize=1)
def _cipher() -> MultiFernet:
    current = settings.health_data_key.strip().encode() or _DEV_KEY
    previous = [key.strip().encode() for key in settings.health_data_previous_keys.split(",") if key.strip()]
    return MultiFernet([Fernet(current), *(Fernet(key) for key in previous)])


def encrypt(value: str) -> str:
    return PREFIX + _cipher().encrypt(value.encode("utf-8")).decode("ascii")


def decrypt(value: str) -> str:
    if not value.startswith(PREFIX):
        return value  # written before encryption was enabled
    try:
        return _cipher().decrypt(value[len(PREFIX):].encode("ascii")).decode("utf-8")
    except InvalidToken as exc:
        raise RuntimeError("Health data cannot be decrypted: check HEALTH_DATA_KEY / HEALTH_DATA_PREVIOUS_KEYS.") from exc


class EncryptedText(TypeDecorator):
    """A text column stored encrypted."""

    impl = Text
    cache_ok = True

    def process_bind_param(self, value, dialect):
        return None if value is None else encrypt(str(value))

    def process_result_value(self, value, dialect):
        return None if value is None else decrypt(value)


class EncryptedJSON(TypeDecorator):
    """A JSON value (list or dict) stored encrypted as text."""

    impl = Text
    cache_ok = True

    def process_bind_param(self, value, dialect):
        return None if value is None else encrypt(json.dumps(value, ensure_ascii=False))

    def process_result_value(self, value, dialect):
        if value is None:
            return None
        return json.loads(decrypt(value))
