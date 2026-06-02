from __future__ import annotations

import argparse
import shutil
from dataclasses import dataclass
from pathlib import Path


BACKEND_ROOT = Path(__file__).resolve().parents[1]
PROJECT_ROOT = BACKEND_ROOT.parent


@dataclass(frozen=True)
class EvidenceDraft:
    template_name: str
    target_name: str


DRAFTS = [
    EvidenceDraft(
        template_name="STAGING_MIGRATION_EVIDENCE.example.md",
        target_name="STAGING_MIGRATION_EVIDENCE.md",
    ),
    EvidenceDraft(
        template_name="STAGING_PARITY_EVIDENCE.example.md",
        target_name="STAGING_PARITY_EVIDENCE.md",
    ),
    EvidenceDraft(
        template_name="LEGAL_REVIEW_SIGNOFF.example.md",
        target_name="LEGAL_REVIEW_SIGNOFF.md",
    ),
    EvidenceDraft(
        template_name="INCIDENT_RESPONSE_CONTACTS.example.md",
        target_name="INCIDENT_RESPONSE_CONTACTS.md",
    ),
]


def initialize_drafts(
    *,
    template_root: Path,
    evidence_root: Path,
    write: bool,
    overwrite: bool,
) -> tuple[str, int]:
    lines = [
        "EduConnect Launch Evidence Draft Initializer",
        "===========================================",
        "These drafts are templates only. They are not launch evidence until completed with real command output, contacts, and sign-offs.",
        "",
    ]
    exit_code = 0

    for draft in DRAFTS:
        template = template_root / draft.template_name
        target = evidence_root / draft.target_name
        if not template.exists():
            exit_code = 1
            lines.append(f"[BLOCKED] missing template: {template}")
            continue

        if target.exists() and not overwrite:
            lines.append(f"[SKIP] {target} already exists. Pass --overwrite to replace it.")
            continue

        action = "overwrite" if target.exists() else "create"
        if not write:
            lines.append(f"[DRY-RUN] Would {action} {target} from {template}")
            continue

        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(template, target)
        lines.append(f"[{action.upper()}] {target} from {template}")

    lines.append("")
    if not write:
        lines.append("Dry run only. Re-run with --write to create private draft files.")
    else:
        lines.append("Draft initialization complete. Fill these files with real launch evidence before validation.")
    lines.append("Validation will remain blocked while placeholders, template choices, or missing values remain.")
    return "\n".join(lines), exit_code


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Create private launch evidence draft files from the checked-in examples."
    )
    parser.add_argument("--template-root", default=str(PROJECT_ROOT), help="Directory containing *.example.md files.")
    parser.add_argument("--evidence-root", default=str(PROJECT_ROOT), help="Directory where private draft files live.")
    parser.add_argument(
        "--write",
        action="store_true",
        help="Actually create draft files. Without this, only a dry run is printed.",
    )
    parser.add_argument(
        "--overwrite",
        action="store_true",
        help="Replace existing draft files. Existing files are preserved by default.",
    )
    args = parser.parse_args()

    report, exit_code = initialize_drafts(
        template_root=Path(args.template_root).resolve(),
        evidence_root=Path(args.evidence_root).resolve(),
        write=args.write,
        overwrite=args.overwrite,
    )
    print(report)
    return exit_code


if __name__ == "__main__":
    raise SystemExit(main())
