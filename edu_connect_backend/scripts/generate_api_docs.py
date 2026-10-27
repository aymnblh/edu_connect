"""Write docs/API_REFERENCE.md from the FastAPI application itself.

    cd edu_connect_backend
    APP_ENV=test python scripts/generate_api_docs.py

The list of routes, their parameters and descriptions come straight from the
code, so the reference cannot drift from what the server really exposes.
"""
from __future__ import annotations

import inspect
import os
import sys
from collections import defaultdict
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND))
os.environ.setdefault("APP_ENV", "test")

from app.main import app  # noqa: E402

OUTPUT = BACKEND.parent / "docs" / "API_REFERENCE.md"
METHODS = ("get", "post", "put", "patch", "delete")


def first_line(text: str | None) -> str:
    if not text:
        return ""
    return " ".join(inspect.cleandoc(text).split("\n\n")[0].split())


def main() -> int:
    schema = app.openapi()
    by_tag: dict[str, list[tuple[str, str, str, list[str]]]] = defaultdict(list)
    for path, item in schema["paths"].items():
        for method in METHODS:
            op = item.get(method)
            if not op:
                continue
            tag = (op.get("tags") or ["Other"])[0]
            params = [
                f"{p['name']}{'*' if p.get('required') else ''}"
                for p in op.get("parameters", [])
                if p.get("in") in ("query", "path")
            ]
            by_tag[tag].append((method.upper(), path, first_line(op.get("description") or op.get("summary")), params))

    total = sum(len(routes) for routes in by_tag.values())
    lines = [
        "# API reference",
        "",
        f"_{total} endpoints, generated from the code by `edu_connect_backend/scripts/generate_api_docs.py`._",
        "",
        "Every endpoint except the public ones needs `Authorization: Bearer <access token>`. "
        "Parameters marked `*` are required; path parameters appear in the URL. "
        "Who may call an endpoint is enforced by the server (see [Security and privacy](SECURITY.md)); "
        "the interactive explorer (`/docs`) is disabled in production.",
        "",
        "Public endpoints (no account): `/health*`, `/auth/login`, `/auth/refresh`, `/auth/verify-code`, "
        "`/auth/register-parent-code`, `/auth/complete-*-code`, `/auth/demo*`, `/onboarding/register-school`, "
        "`/public/report-cards/{code}`.",
        "",
    ]
    for tag in sorted(by_tag):
        lines += [f"## {tag}", "", "| Method | Path | What it does | Parameters |", "| --- | --- | --- | --- |"]
        for method, path, description, params in sorted(by_tag[tag], key=lambda r: (r[1], r[0])):
            description = description.replace("|", "/")
            lines.append(f"| {method} | `{path}` | {description} | {', '.join(params) or '—'} |")
        lines.append("")

    OUTPUT.parent.mkdir(exist_ok=True)
    OUTPUT.write_text("\n".join(lines), encoding="utf-8", newline="\n")
    print(f"{total} endpoints written to {OUTPUT}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
