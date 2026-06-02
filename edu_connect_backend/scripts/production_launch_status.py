from __future__ import annotations

import argparse
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path


BACKEND_ROOT = Path(__file__).resolve().parents[1]
PROJECT_ROOT = BACKEND_ROOT.parent
CHECKLIST_PATH = PROJECT_ROOT / "PRODUCTION_READINESS_CHECKLIST.md"
sys.path.insert(0, str(BACKEND_ROOT))
from scripts.validate_launch_evidence import validate_all


@dataclass(frozen=True)
class ChecklistItem:
    line_number: int
    checked: bool
    text: str


@dataclass(frozen=True)
class ExternalGate:
    name: str
    marker: str
    evidence_path: Path
    description: str
    command: str | None = None


EXTERNAL_GATES = [
    ExternalGate(
        name="staging migration",
        marker="alembic upgrade head",
        evidence_path=PROJECT_ROOT / "STAGING_MIGRATION_EVIDENCE.md",
        description="Record a successful Alembic upgrade on a staging copy of production-like data.",
        command=(
            "cd edu_connect_backend && python scripts/collect_staging_evidence.py "
            "--production-env .env.production --staging-env .env.staging "
            "--staging-api-url https://staging-api.example.com"
        ),
    ),
    ExternalGate(
        name="legal review",
        marker="Legal review is complete",
        evidence_path=PROJECT_ROOT / "LEGAL_REVIEW_SIGNOFF.md",
        description="Store legal/privacy approval for Algerian personal data protection obligations.",
    ),
    ExternalGate(
        name="incident contacts",
        marker="Incident response contacts",
        evidence_path=PROJECT_ROOT / "INCIDENT_RESPONSE_CONTACTS.md",
        description="Keep the real named incident roster in a private operations vault or private repo.",
    ),
    ExternalGate(
        name="staging parity",
        marker="Staging mirrors production",
        evidence_path=PROJECT_ROOT / "STAGING_PARITY_EVIDENCE.md",
        description="Record live staging parity checks with staging-only secrets and data.",
        command=(
            "cd edu_connect_backend && python scripts/collect_staging_evidence.py "
            "--production-env .env.production --staging-env .env.staging "
            "--staging-api-url https://staging-api.example.com"
        ),
    ),
]


def local_gate_commands(*, use_generated_envs: bool = False) -> list[list[str]]:
    if use_generated_envs:
        return [
            ["python", "scripts/check_production_posture.py", "--actual-env", ".env.production.generated"],
            [
                "python",
                "scripts/check_staging_parity.py",
                "--production-env",
                ".env.production.generated",
                "--staging-env",
                ".env.staging.generated",
            ],
            [
                "python",
                "scripts/review_env_readiness.py",
                "--production-env",
                ".env.production.generated",
                "--staging-env",
                ".env.staging.generated",
            ],
            ["python", "scripts/rehearse_key_rotation.py"],
        ]
    return [
        ["python", "scripts/check_production_posture.py", "--skip-private-env"],
        ["python", "scripts/check_staging_parity.py", "--allow-placeholders"],
        ["python", "scripts/rehearse_key_rotation.py"],
    ]


def checklist_items(path: Path = CHECKLIST_PATH) -> list[ChecklistItem]:
    items: list[ChecklistItem] = []
    for line_number, raw_line in enumerate(path.read_text(encoding="utf-8").splitlines(), start=1):
        stripped = raw_line.strip()
        if stripped.startswith("- [x] ") or stripped.startswith("- [ ] "):
            items.append(
                ChecklistItem(
                    line_number=line_number,
                    checked=stripped.startswith("- [x] "),
                    text=stripped[6:],
                )
            )
    return items


def evidence_for(item: ChecklistItem) -> ExternalGate | None:
    for gate in EXTERNAL_GATES:
        if gate.marker in item.text:
            return gate
    return None


def run_local_gates(*, use_generated_envs: bool = False) -> list[str]:
    failures: list[str] = []
    for command in local_gate_commands(use_generated_envs=use_generated_envs):
        result = subprocess.run(
            command,
            cwd=BACKEND_ROOT,
            text=True,
            capture_output=True,
            timeout=60,
        )
        if result.returncode != 0:
            failures.append(
                f"{' '.join(command)} failed with exit {result.returncode}:\n{result.stderr.strip()}"
            )
    return failures


def build_report(
    *,
    verify_local: bool = False,
    validate_evidence: bool = True,
    use_generated_envs: bool = False,
) -> tuple[str, int]:
    items = checklist_items()
    checked = [item for item in items if item.checked]
    unchecked = [item for item in items if not item.checked]
    evidence_results = validate_all(PROJECT_ROOT) if validate_evidence else {}

    lines = [
        "EduConnect Production Launch Status",
        "===================================",
        f"Checklist: {len(checked)}/{len(items)} gates checked.",
    ]

    exit_code = 0
    if verify_local:
        local_failures = run_local_gates(use_generated_envs=use_generated_envs)
        if local_failures:
            exit_code = 1
            lines.append("")
            lines.append("Local gate failures:")
            for failure in local_failures:
                lines.append(f"- {failure}")
        else:
            if use_generated_envs:
                lines.append("Local generated-env/key gates passed.")
            else:
                lines.append("Local posture/key/parity-template gates passed.")

    if unchecked:
        exit_code = 1
        lines.append("")
        lines.append("Remaining launch blockers:")
        for item in unchecked:
            gate = evidence_for(item)
            lines.append(f"- Line {item.line_number}: {item.text}")
            if gate:
                lines.append(f"  Evidence: {gate.evidence_path}")
                lines.append(f"  Required: {gate.description}")
                gate_failures = evidence_results.get(gate.name, []) if validate_evidence else []
                if validate_evidence:
                    if gate_failures:
                        lines.append("  Evidence status: incomplete")
                        for failure in gate_failures:
                            lines.append(f"    - {failure}")
                    else:
                        lines.append("  Evidence status: complete; checklist can be updated after reviewer approval.")
                if gate.command:
                    lines.append(f"  Command: {gate.command}")
            else:
                lines.append("  Required: add concrete evidence, then update the checklist.")
    else:
        lines.append("")
        lines.append("No checklist blockers remain.")

    lines.append("")
    lines.append("Do not mark external gates complete without preserving the named evidence.")
    return "\n".join(lines), exit_code


def main() -> int:
    parser = argparse.ArgumentParser(description="Report EduConnect production launch blockers.")
    parser.add_argument(
        "--verify-local",
        action="store_true",
        help="Run fast local posture checks before reporting checklist blockers.",
    )
    parser.add_argument(
        "--allow-blockers",
        action="store_true",
        help="Print blockers but exit 0. Useful for dashboards or documentation refreshes.",
    )
    parser.add_argument(
        "--skip-evidence-validation",
        action="store_true",
        help="Do not inspect private evidence files while building the report.",
    )
    parser.add_argument(
        "--use-generated-envs",
        action="store_true",
        help="Validate .env.production.generated and .env.staging.generated during local gate checks.",
    )
    args = parser.parse_args()

    report, exit_code = build_report(
        verify_local=args.verify_local,
        validate_evidence=not args.skip_evidence_validation,
        use_generated_envs=args.use_generated_envs,
    )
    print(report)
    if args.allow_blockers:
        return 0
    return exit_code


if __name__ == "__main__":
    raise SystemExit(main())
