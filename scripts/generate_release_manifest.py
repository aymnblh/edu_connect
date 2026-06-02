from __future__ import annotations

import argparse
import hashlib
import platform
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]
BACKEND_ROOT = PROJECT_ROOT / "edu_connect_backend"
WEB_ROOT = PROJECT_ROOT / "edu_connect_web"
FLUTTER_ROOT = PROJECT_ROOT / "edu_connect"
DEFAULT_OUTPUT = PROJECT_ROOT / "RELEASE_MANIFEST.md"


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as file:
        for chunk in iter(lambda: file.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def combined_hash(entries: list[tuple[str, int, str]]) -> str:
    digest = hashlib.sha256()
    for relative_path, size, file_hash in sorted(entries):
        digest.update(relative_path.encode("utf-8"))
        digest.update(b"\0")
        digest.update(str(size).encode("ascii"))
        digest.update(b"\0")
        digest.update(file_hash.encode("ascii"))
        digest.update(b"\n")
    return digest.hexdigest()


def command_output(command: list[str], cwd: Path = PROJECT_ROOT) -> str:
    try:
        result = subprocess.run(
            command,
            cwd=cwd,
            text=True,
            capture_output=True,
            timeout=30,
        )
    except FileNotFoundError:
        return "unavailable"
    except subprocess.TimeoutExpired:
        return "timeout"
    if result.returncode != 0:
        return "unavailable"
    return (result.stdout or result.stderr).strip() or "ok"


def alembic_head() -> str:
    return command_output([sys.executable, "-m", "alembic", "heads"], BACKEND_ROOT)


def git_commit() -> str:
    return command_output(["git", "rev-parse", "HEAD"], PROJECT_ROOT)


def file_fingerprint(path: Path) -> tuple[str, int, str] | None:
    if not path.exists():
        return None
    return (str(path.relative_to(PROJECT_ROOT)).replace("\\", "/"), path.stat().st_size, sha256_file(path))


def directory_fingerprints(root: Path) -> list[tuple[str, int, str]]:
    if not root.exists():
        return []
    files: list[tuple[str, int, str]] = []
    for path in sorted(root.rglob("*")):
        if "__pycache__" in path.parts or path.suffix in {".pyc", ".pyo"}:
            continue
        if path.is_file():
            files.append((str(path.relative_to(PROJECT_ROOT)).replace("\\", "/"), path.stat().st_size, sha256_file(path)))
    return files


def render_table(headers: tuple[str, ...], rows: list[tuple[str, ...]]) -> list[str]:
    lines = [
        "| " + " | ".join(headers) + " |",
        "| " + " | ".join("---" for _ in headers) + " |",
    ]
    lines.extend("| " + " | ".join(row) + " |" for row in rows)
    return lines


def render_manifest(*, web_api_base_url: str | None = None) -> str:
    generated_at = datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")

    source_files = [
        PROJECT_ROOT / "PRODUCTION_READINESS_CHECKLIST.md",
        PROJECT_ROOT / "OPERATIONS_RUNBOOK.md",
        PROJECT_ROOT / "LAUNCH_EVIDENCE_COLLECTION_GUIDE.md",
        BACKEND_ROOT / "requirements.txt",
        BACKEND_ROOT / "requirements-dev.txt",
        WEB_ROOT / "package-lock.json",
        WEB_ROOT / "package.json",
        FLUTTER_ROOT / "pubspec.yaml",
        FLUTTER_ROOT / "pubspec.lock",
    ]
    source_fingerprints = [fingerprint for path in source_files if (fingerprint := file_fingerprint(path))]
    root_script_fingerprints = directory_fingerprints(PROJECT_ROOT / "scripts")
    migration_fingerprints = directory_fingerprints(BACKEND_ROOT / "alembic" / "versions")
    backend_script_fingerprints = directory_fingerprints(BACKEND_ROOT / "scripts")
    web_fingerprints = directory_fingerprints(WEB_ROOT / "dist")

    source_rows = [
        (relative_path, str(size), file_hash)
        for relative_path, size, file_hash in source_fingerprints
    ]
    web_rows = [
        (relative_path.removeprefix("edu_connect_web/dist/"), str(size), file_hash)
        for relative_path, size, file_hash in web_fingerprints
    ]

    lines = [
        "# EduConnect Release Manifest",
        "",
        f"- Generated at UTC: {generated_at}",
        f"- Git commit: {git_commit()}",
        f"- Python: {platform.python_version()}",
        f"- Platform: {platform.platform()}",
        f"- Alembic head: {alembic_head()}",
        f"- Web API base URL: {web_api_base_url or 'not provided'}",
        f"- Source fingerprint: {combined_hash(source_fingerprints + root_script_fingerprints + backend_script_fingerprints + migration_fingerprints)}",
        f"- Web dist fingerprint: {combined_hash(web_fingerprints) if web_fingerprints else 'missing'}",
        "",
        "## Source And Lock Files",
        "",
        *render_table(("Path", "Bytes", "SHA-256"), source_rows),
        "",
        "## Release Scripts",
        "",
        *render_table(
            ("Path", "Bytes", "SHA-256"),
            [
                (relative_path, str(size), file_hash)
                for relative_path, size, file_hash in root_script_fingerprints + backend_script_fingerprints
            ],
        ),
        "",
        "## Alembic Migrations",
        "",
        *render_table(
            ("Path", "Bytes", "SHA-256"),
            [(relative_path, str(size), file_hash) for relative_path, size, file_hash in migration_fingerprints],
        ),
        "",
        "## Web Build Artifacts",
        "",
    ]
    if web_rows:
        lines.extend(render_table(("Dist Path", "Bytes", "SHA-256"), web_rows))
    else:
        lines.append("No `edu_connect_web/dist` artifacts were found. Run the web production build first.")
    lines.extend(
        [
            "",
            "## Validation Commands",
            "",
            "```bash",
            "python scripts/run_release_gates.py --allow-blockers --use-generated-envs --web-api-base-url https://api.educonnect.dz",
            "cd edu_connect_backend",
            "python scripts/validate_launch_evidence.py --evidence-root ..",
            "python scripts/production_launch_status.py --verify-local --use-generated-envs",
            "```",
            "",
        ]
    )
    return "\n".join(lines)


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate an EduConnect release manifest with deterministic artifact fingerprints.")
    parser.add_argument("--output", default=str(DEFAULT_OUTPUT), help="Manifest output path.")
    parser.add_argument("--web-api-base-url", default="", help="Production web API base URL recorded in the manifest.")
    args = parser.parse_args()

    output = Path(args.output).resolve()
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(render_manifest(web_api_base_url=args.web_api_base_url), encoding="utf-8")
    print(f"Release manifest written: {output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
