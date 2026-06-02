from __future__ import annotations

import argparse
import re
import sys
from dataclasses import dataclass
from pathlib import Path


BACKEND_ROOT = Path(__file__).resolve().parents[1]
PROJECT_ROOT = BACKEND_ROOT.parent

PLACEHOLDER_RE = re.compile(
    r"(TODO|Pending|not provided|REPLACE_WITH[A-Z0-9_]*|YOUR_[A-Z0-9_]*|PASS\s*/\s*FAIL|YES\s*/\s*NO|APPROVED\s*/)",
    re.IGNORECASE,
)


@dataclass(frozen=True)
class EvidenceCheck:
    name: str
    path: Path
    required_for_checklist: str


EVIDENCE_CHECKS = [
    EvidenceCheck(
        name="staging migration",
        path=PROJECT_ROOT / "STAGING_MIGRATION_EVIDENCE.md",
        required_for_checklist="`alembic upgrade head` succeeds on a staging copy of production-like data.",
    ),
    EvidenceCheck(
        name="legal review",
        path=PROJECT_ROOT / "LEGAL_REVIEW_SIGNOFF.md",
        required_for_checklist="Legal review is complete for Algerian personal data protection obligations.",
    ),
    EvidenceCheck(
        name="incident contacts",
        path=PROJECT_ROOT / "INCIDENT_RESPONSE_CONTACTS.md",
        required_for_checklist="Incident response contacts and escalation paths are documented with real named contacts.",
    ),
    EvidenceCheck(
        name="staging parity",
        path=PROJECT_ROOT / "STAGING_PARITY_EVIDENCE.md",
        required_for_checklist="Staging mirrors production auth, RLS, storage, and tenant settings using the real staging environment.",
    ),
]

LEGAL_YES_FIELDS = [
    "Algerian Law 18-07 / ANPDP obligations reviewed",
    "Data processing roles documented",
    "Data retention policy approved",
    "Parent/student export process approved",
    "Deletion/archive process approved",
    "Incident notification thresholds approved",
]

INCIDENT_ROLES = [
    "Incident commander",
    "Backend owner",
    "Database owner",
    "Infrastructure owner",
    "School/customer contact",
    "Legal/privacy contact",
]


def _read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def _field_value(content: str, label: str) -> str | None:
    pattern = re.compile(rf"^- {re.escape(label)}:\s*(.+?)\s*$", re.MULTILINE)
    match = pattern.search(content)
    if not match:
        return None
    return match.group(1).strip()


def _has_placeholders(content: str) -> bool:
    return bool(PLACEHOLDER_RE.search(content))


def validate_staging_migration(path: Path) -> list[str]:
    content = _read(path)
    failures: list[str] = []
    if _has_placeholders(content):
        failures.append("staging migration evidence still contains placeholders or missing values.")
    for required in (
        "Result: PASS",
        "Source backup timestamp:",
        "Source backup checksum:",
        "alembic upgrade head",
        "alembic current after",
    ):
        if required not in content:
            failures.append(f"staging migration evidence is missing `{required}`.")
    return failures


def validate_staging_parity(path: Path) -> list[str]:
    content = _read(path)
    failures: list[str] = []
    if _has_placeholders(content):
        failures.append("staging parity evidence still contains placeholders or missing values.")
    for required in (
        "Result: PASS",
        "staging parity config check",
        "staging health",
        "staging readiness",
        "staging PostgreSQL RLS integration tests",
    ):
        if required not in content:
            failures.append(f"staging parity evidence is missing `{required}`.")
    return failures


def validate_legal_review(path: Path) -> list[str]:
    content = _read(path)
    failures: list[str] = []
    if _has_placeholders(content):
        failures.append("legal review sign-off still contains placeholders or template choices.")
    for field in (
        "Date/time UTC",
        "Reviewer name",
        "Reviewer role / organization",
        "Jurisdictions reviewed",
        "Terms/privacy notice version",
        "Next review date",
    ):
        value = _field_value(content, field)
        if not value:
            failures.append(f"legal review is missing `{field}`.")
    for field in LEGAL_YES_FIELDS:
        value = _field_value(content, field)
        if value != "YES":
            failures.append(f"legal review must set `{field}` to YES.")
    result = _field_value(content, "Result")
    if result != "APPROVED":
        failures.append("legal review result must be exactly APPROVED before launch.")
    conditions = _field_value(content, "Conditions before launch")
    if conditions and conditions.lower() not in {"none", "n/a", "no open conditions"}:
        failures.append("legal review has open launch conditions.")
    return failures


def validate_incident_contacts(path: Path) -> list[str]:
    content = _read(path)
    failures: list[str] = []
    if _has_placeholders(content):
        failures.append("incident contact roster still contains placeholders.")
    for role in INCIDENT_ROLES:
        row_pattern = re.compile(rf"^\|\s*{re.escape(role)}\s*\|(.+)\|$", re.MULTILINE)
        match = row_pattern.search(content)
        if not match:
            failures.append(f"incident roster is missing `{role}`.")
            continue
        cells = [cell.strip() for cell in match.group(1).split("|")]
        if len(cells) < 5 or any(not cell for cell in cells[:4]):
            failures.append(f"incident roster row for `{role}` must include name, primary contact, backup contact, and availability.")
    for severity in ("SEV1", "SEV2", "SEV3"):
        if severity not in content:
            failures.append(f"incident roster is missing escalation path for {severity}.")
    return failures


VALIDATORS = {
    "staging migration": validate_staging_migration,
    "staging parity": validate_staging_parity,
    "legal review": validate_legal_review,
    "incident contacts": validate_incident_contacts,
}


def validate_all(evidence_root: Path = PROJECT_ROOT) -> dict[str, list[str]]:
    results: dict[str, list[str]] = {}
    for check in EVIDENCE_CHECKS:
        path = evidence_root / check.path.name
        if not path.exists():
            results[check.name] = [f"missing evidence file: {path}"]
            continue
        results[check.name] = VALIDATORS[check.name](path)
    return results


def successful_checks(results: dict[str, list[str]]) -> set[str]:
    return {name for name, failures in results.items() if not failures}


def checklist_lines_to_mark(results: dict[str, list[str]]) -> list[str]:
    ready = successful_checks(results)
    lines: list[str] = []
    for check in EVIDENCE_CHECKS:
        if check.name in ready:
            lines.append(check.required_for_checklist)
    return lines


def render_report(results: dict[str, list[str]]) -> tuple[str, int]:
    lines = ["EduConnect External Evidence Validation", "======================================"]
    exit_code = 0
    for check in EVIDENCE_CHECKS:
        failures = results.get(check.name, ["not evaluated"])
        if failures:
            exit_code = 1
            lines.append(f"[BLOCKED] {check.name}:")
            for failure in failures:
                lines.append(f"- {failure}")
        else:
            lines.append(f"[PASS] {check.name}: evidence is complete.")

    ready_lines = checklist_lines_to_mark(results)
    if ready_lines:
        lines.append("")
        lines.append("Checklist items that can be marked complete:")
        for item in ready_lines:
            lines.append(f"- {item}")
    return "\n".join(lines), exit_code


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate private EduConnect launch evidence files.")
    parser.add_argument("--evidence-root", default=str(PROJECT_ROOT))
    parser.add_argument(
        "--allow-missing",
        action="store_true",
        help="Print validation status but exit 0 even when evidence is missing/incomplete.",
    )
    args = parser.parse_args()

    report, exit_code = render_report(validate_all(Path(args.evidence_root).resolve()))
    print(report)
    if args.allow_missing:
        return 0
    return exit_code


if __name__ == "__main__":
    raise SystemExit(main())
