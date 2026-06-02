from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def _read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def _env_values(path: Path) -> dict[str, str]:
    values: dict[str, str] = {}
    for raw_line in _read(path).splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key.strip()] = value.strip()
    return values


def main() -> int:
    parser = argparse.ArgumentParser(description="Check EduConnect production posture.")
    parser.add_argument(
        "--skip-private-env",
        action="store_true",
        help="Validate checked-in posture/templates only, without inspecting local .env.production.",
    )
    parser.add_argument(
        "--actual-env",
        default=str(ROOT / ".env.production"),
        help="Path to the private production env file to inspect.",
    )
    args = parser.parse_args()

    failures: list[str] = []

    dockerignore = _read(ROOT / ".dockerignore")
    for required in ("secrets/", ".env.*", "private_media/", "backups/"):
        if required not in dockerignore:
            failures.append(f".dockerignore must exclude {required}")

    compose = _read(ROOT / "docker-compose.yml")
    if "./secrets:/app/secrets:ro" not in compose:
        failures.append("production compose must mount RSA keys read-only")
    if "NOBYPASSRLS" not in _read(ROOT / "scripts" / "init-db.sh"):
        failures.append("database app role must be created with NOBYPASSRLS")

    prod_example = _env_values(ROOT / ".env.production.example")
    if prod_example.get("APP_ENV") != "production":
        failures.append(".env.production.example must set APP_ENV=production")
    if prod_example.get("CREATE_TABLES_ON_STARTUP") != "false":
        failures.append("production must not create tables at startup")
    if not prod_example.get("CORS_ORIGINS", "").startswith("https://"):
        failures.append("production CORS example must use explicit HTTPS origins")
    if prod_example.get("MEDIA_MALWARE_SCAN_REQUIRED") != "true":
        failures.append("production malware scanning must be required")

    weak_placeholder = re.compile(r"^(change-this|postgres_password|edu_password)$", re.IGNORECASE)
    for key in ("PLATFORM_SECRET", "SERVER_FINGERPRINT_SALT", "APP_DB_PASSWORD", "POSTGRES_SUPERUSER_PASSWORD"):
        value = prod_example.get(key, "")
        if not value or weak_placeholder.search(value):
            failures.append(f"{key} must not use a weak placeholder in production example")

    actual_env = Path(args.actual_env)
    if actual_env.exists() and not args.skip_private_env:
        actual_values = _env_values(actual_env)
        if actual_values.get("APP_ENV") != "production":
            failures.append(f"{actual_env.name} must set APP_ENV=production")
        for key, value in actual_values.items():
            if "REPLACE_WITH" in value or "YOUR_" in value:
                failures.append(f"{actual_env.name} still has placeholder value for {key}")

    if failures:
        for failure in failures:
            print(f"FAIL: {failure}", file=sys.stderr)
        return 1

    print("production posture checks passed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
