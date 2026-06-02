from __future__ import annotations

import argparse
import re
import secrets
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]

SECRET_BYTES = {
    "POSTGRES_SUPERUSER_PASSWORD": 36,
    "APP_DB_PASSWORD": 36,
    "PLATFORM_SECRET": 64,
    "SERVER_FINGERPRINT_SALT": 64,
    "NTFY_AUTH_TOKEN": 48,
}

PLACEHOLDER_RE = re.compile(
    r"(YOUR_|REPLACE_WITH|change-this|postgres_password|edu_password)",
    re.IGNORECASE,
)


def _secret(num_bytes: int) -> str:
    return secrets.token_urlsafe(num_bytes)


def _generated_values() -> dict[str, str]:
    return {key: _secret(num_bytes) for key, num_bytes in SECRET_BYTES.items()}


def _replace_env_line(line: str, values: dict[str, str]) -> str:
    if not line.strip() or line.lstrip().startswith("#") or "=" not in line:
        return line

    key, current = line.split("=", 1)
    key = key.strip()
    if key == "DATABASE_URL":
        current = re.sub(
            r"YOUR_[A-Z_]*APP_DATABASE_PASSWORD",
            values["APP_DB_PASSWORD"],
            current,
        )
        return f"{key}={current}"
    if key in values:
        return f"{key}={values[key]}"
    return line


def render_generated_env(template: str, values: dict[str, str] | None = None) -> str:
    generated = values or _generated_values()
    lines = [_replace_env_line(line, generated) for line in template.splitlines()]
    return "\n".join(lines).rstrip() + "\n"


def env_values(content: str) -> dict[str, str]:
    values: dict[str, str] = {}
    for raw_line in content.splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key.strip()] = value.strip()
    return values


def validate_generated_env(content: str) -> list[str]:
    failures: list[str] = []
    values = env_values(content)
    for key in SECRET_BYTES:
        value = values.get(key, "")
        if len(value) < 32:
            failures.append(f"{key} is missing or too short.")
        if PLACEHOLDER_RE.search(value):
            failures.append(f"{key} still contains a placeholder.")

    database_url = values.get("DATABASE_URL", "")
    if not database_url:
        failures.append("DATABASE_URL is missing.")
    elif PLACEHOLDER_RE.search(database_url):
        failures.append("DATABASE_URL still contains a placeholder password.")
    elif values.get("APP_DB_PASSWORD") and values["APP_DB_PASSWORD"] not in database_url:
        failures.append("DATABASE_URL password does not match APP_DB_PASSWORD.")

    return failures


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Generate a local production or staging env file with strong placeholder replacements."
    )
    parser.add_argument("--template", default=str(ROOT / ".env.production.example"))
    parser.add_argument("--output", default=str(ROOT / ".env.production.generated"))
    parser.add_argument(
        "--overwrite",
        action="store_true",
        help="Overwrite the output file if it already exists.",
    )
    args = parser.parse_args()

    template_path = Path(args.template).resolve()
    output_path = Path(args.output).resolve()

    if not template_path.exists():
        print(f"FAIL: template file not found: {template_path}", file=sys.stderr)
        return 1
    if output_path.exists() and not args.overwrite:
        print(
            f"FAIL: output file already exists: {output_path}. Pass --overwrite to replace it.",
            file=sys.stderr,
        )
        return 1

    rendered = render_generated_env(template_path.read_text(encoding="utf-8"))
    failures = validate_generated_env(rendered)
    if failures:
        for failure in failures:
            print(f"FAIL: {failure}", file=sys.stderr)
        return 1

    output_path.write_text(rendered, encoding="utf-8")
    app_env = env_values(rendered).get("APP_ENV", "environment")
    print(f"Generated {app_env} env file: {output_path}")
    print("Review domain, backup, and provider values before promoting it to the target env file.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
