from __future__ import annotations

import argparse
import shutil
import sys
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from scripts.review_env_readiness import build_report


def _utc_stamp() -> str:
    return datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")


def _backup_path(path: Path, stamp: str) -> Path:
    return path.with_name(f"{path.name}.backup.{stamp}")


def _copy_with_backup(source: Path, target: Path, stamp: str) -> list[str]:
    lines: list[str] = []
    if source.resolve() == target.resolve():
        raise ValueError(f"source and target are the same file: {source}")

    if target.exists():
        backup = _backup_path(target, stamp)
        shutil.copy2(target, backup)
        lines.append(f"Backed up {target} -> {backup}")

    shutil.copy2(source, target)
    lines.append(f"Promoted {source} -> {target}")
    return lines


def promote(
    *,
    production_source: Path,
    staging_source: Path,
    production_target: Path,
    staging_target: Path,
    apply: bool,
) -> tuple[str, int]:
    report, exit_code = build_report(production_source, staging_source)
    lines = [report, ""]
    if exit_code != 0:
        lines.append("Promotion blocked: generated env files are not ready.")
        return "\n".join(lines), exit_code

    if not apply:
        lines.append("Dry run only. Re-run with --apply to promote generated env files.")
        lines.append(f"Would promote {production_source} -> {production_target}")
        lines.append(f"Would promote {staging_source} -> {staging_target}")
        return "\n".join(lines), 0

    stamp = _utc_stamp()
    try:
        lines.extend(_copy_with_backup(production_source, production_target, stamp))
        lines.extend(_copy_with_backup(staging_source, staging_target, stamp))
    except Exception as exc:
        lines.append(f"Promotion failed: {exc}")
        return "\n".join(lines), 1

    promoted_report, promoted_exit = build_report(production_target, staging_target)
    lines.append("")
    lines.append("Post-promotion validation:")
    lines.append(promoted_report)
    if promoted_exit == 0:
        lines.append("Promotion complete.")
    return "\n".join(lines), promoted_exit


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Validate and promote generated production/staging env files with backups."
    )
    parser.add_argument("--production-source", default=str(ROOT / ".env.production.generated"))
    parser.add_argument("--staging-source", default=str(ROOT / ".env.staging.generated"))
    parser.add_argument("--production-target", default=str(ROOT / ".env.production"))
    parser.add_argument("--staging-target", default=str(ROOT / ".env.staging"))
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Actually copy generated env files to their target paths. Without this, only a dry run is performed.",
    )
    args = parser.parse_args()

    report, exit_code = promote(
        production_source=Path(args.production_source).resolve(),
        staging_source=Path(args.staging_source).resolve(),
        production_target=Path(args.production_target).resolve(),
        staging_target=Path(args.staging_target).resolve(),
        apply=args.apply,
    )
    print(report)
    return exit_code


if __name__ == "__main__":
    raise SystemExit(main())
