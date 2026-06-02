from __future__ import annotations

import argparse
import subprocess
import sys
import tempfile
from pathlib import Path


BACKEND_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SQL_OUTPUT = Path(tempfile.gettempdir()) / "educonnect-alembic-upgrade-head.sql"


def run_alembic(args: list[str], *, timeout: int = 120) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [sys.executable, "-m", "alembic", *args],
        cwd=BACKEND_ROOT,
        text=True,
        capture_output=True,
        timeout=timeout,
    )


def check_single_head() -> tuple[list[str], str | None]:
    result = run_alembic(["heads"], timeout=60)
    if result.returncode != 0:
        return [], f"`alembic heads` failed with exit {result.returncode}:\n{result.stderr.strip()}"

    heads = [line.strip() for line in result.stdout.splitlines() if line.strip()]
    if len(heads) != 1:
        return heads, f"expected exactly one Alembic head, found {len(heads)}."
    if "(head)" not in heads[0]:
        return heads, f"Alembic head output does not include `(head)`: {heads[0]}"
    return heads, None


def generate_upgrade_sql(output_path: Path) -> str | None:
    result = run_alembic(["upgrade", "head", "--sql"], timeout=120)
    if result.returncode != 0:
        return f"`alembic upgrade head --sql` failed with exit {result.returncode}:\n{result.stderr.strip()}"

    sql = result.stdout
    if not sql.strip():
        return "`alembic upgrade head --sql` produced empty SQL output."
    if "CREATE TABLE alembic_version" not in sql:
        return "generated Alembic SQL does not include alembic_version bootstrap."
    if "INSERT INTO alembic_version" not in sql:
        return "generated Alembic SQL does not record the target revision."

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(sql, encoding="utf-8")
    return None


def main() -> int:
    parser = argparse.ArgumentParser(description="Check Alembic release readiness.")
    parser.add_argument(
        "--sql-output",
        default=str(DEFAULT_SQL_OUTPUT),
        help="Path where offline `alembic upgrade head --sql` output should be written.",
    )
    args = parser.parse_args()

    failures: list[str] = []
    heads, head_failure = check_single_head()
    if head_failure:
        failures.append(head_failure)
    sql_failure = generate_upgrade_sql(Path(args.sql_output).resolve())
    if sql_failure:
        failures.append(sql_failure)

    if failures:
        print("Alembic release checks failed", file=sys.stderr)
        for failure in failures:
            print(f"- {failure}", file=sys.stderr)
        return 1

    print("Alembic release checks passed")
    print(f"- Head: {heads[0]}")
    print(f"- SQL output: {Path(args.sql_output).resolve()}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
