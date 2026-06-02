from __future__ import annotations

import argparse
import os
import shutil
import subprocess
import sys
from dataclasses import dataclass, field
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]
BACKEND_ROOT = PROJECT_ROOT / "edu_connect_backend"
WEB_ROOT = PROJECT_ROOT / "edu_connect_web"
FLUTTER_ROOT = PROJECT_ROOT / "edu_connect"


def executable(name: str) -> str:
    return shutil.which(name) or name


PYTHON = sys.executable
NPM = executable("npm")
FLUTTER = executable("flutter")
DOCKER = executable("docker")


@dataclass(frozen=True)
class ReleaseGate:
    group: str
    name: str
    cwd: Path
    command: list[str]
    env: dict[str, str] = field(default_factory=dict)


def backend_gates(*, allow_blockers: bool, include_docker: bool, use_generated_envs: bool) -> list[ReleaseGate]:
    production_posture_command = [PYTHON, "scripts/check_production_posture.py"]
    staging_parity_command = [PYTHON, "scripts/check_staging_parity.py", "--allow-placeholders"]
    generated_env_gates: list[ReleaseGate] = []
    if use_generated_envs:
        production_posture_command = [
            PYTHON,
            "scripts/check_production_posture.py",
            "--actual-env",
            ".env.production.generated",
        ]
        staging_parity_command = [
            PYTHON,
            "scripts/check_staging_parity.py",
            "--production-env",
            ".env.production.generated",
            "--staging-env",
            ".env.staging.generated",
        ]
        generated_env_gates.append(
            ReleaseGate(
                group="backend",
                name="review generated env readiness",
                cwd=BACKEND_ROOT,
                command=[
                    PYTHON,
                    "scripts/review_env_readiness.py",
                    "--production-env",
                    ".env.production.generated",
                    "--staging-env",
                    ".env.staging.generated",
                ],
            )
        )

    gates = [
        ReleaseGate(
            group="backend",
            name="compile backend",
            cwd=BACKEND_ROOT,
            command=[PYTHON, "-m", "compileall", "app", "alembic", "tests", "scripts"],
        ),
        ReleaseGate(
            group="backend",
            name="check production posture",
            cwd=BACKEND_ROOT,
            command=production_posture_command,
        ),
        ReleaseGate(
            group="backend",
            name="check staging parity generated envs" if use_generated_envs else "check staging parity template",
            cwd=BACKEND_ROOT,
            command=staging_parity_command,
        ),
        *generated_env_gates,
        ReleaseGate(
            group="backend",
            name="check Alembic release shape",
            cwd=BACKEND_ROOT,
            command=[PYTHON, "scripts/check_alembic_release.py"],
        ),
        ReleaseGate(
            group="backend",
            name="rehearse JWT key rotation",
            cwd=BACKEND_ROOT,
            command=[PYTHON, "scripts/rehearse_key_rotation.py"],
        ),
        ReleaseGate(
            group="backend",
            name="run backend tests",
            cwd=BACKEND_ROOT,
            command=[PYTHON, "-m", "pytest", "-q"],
        ),
    ]
    if include_docker:
        gates.append(
            ReleaseGate(
                group="backend",
                name="check production Docker config",
                cwd=BACKEND_ROOT,
                command=[DOCKER, "compose", "--env-file", ".env.production.example", "-f", "docker-compose.yml", "config", "--quiet"],
                env={"ENV_FILE": ".env.production.example"},
            )
        )

    evidence_command = [PYTHON, "scripts/validate_launch_evidence.py"]
    launch_command = [PYTHON, "scripts/production_launch_status.py", "--verify-local"]
    if allow_blockers:
        evidence_command.append("--allow-missing")
        launch_command.append("--allow-blockers")
    if use_generated_envs:
        launch_command.append("--use-generated-envs")

    gates.extend(
        [
            ReleaseGate(
                group="backend",
                name="validate external launch evidence",
                cwd=BACKEND_ROOT,
                command=evidence_command,
            ),
            ReleaseGate(
                group="backend",
                name="report production launch status",
                cwd=BACKEND_ROOT,
                command=launch_command,
            ),
        ]
    )
    return gates


def web_gates(web_api_base_url: str | None) -> list[ReleaseGate]:
    env = {"VITE_API_BASE_URL": web_api_base_url} if web_api_base_url else {}
    return [
        ReleaseGate(group="web", name="lint web app", cwd=WEB_ROOT, command=[NPM, "run", "lint"], env=env),
        ReleaseGate(group="web", name="test workspace role isolation", cwd=WEB_ROOT, command=[NPM, "run", "test:workspace"], env=env),
        ReleaseGate(group="web", name="test web env validator", cwd=WEB_ROOT, command=[NPM, "run", "test:env"], env=env),
        ReleaseGate(group="web", name="validate production web env", cwd=WEB_ROOT, command=[NPM, "run", "check:env"], env=env),
        ReleaseGate(group="web", name="test web secret scanner", cwd=WEB_ROOT, command=[NPM, "run", "test:secret-scanner"], env=env),
        ReleaseGate(group="web", name="build web app", cwd=WEB_ROOT, command=[NPM, "run", "build"], env=env),
        ReleaseGate(group="web", name="scan built web artifacts for secrets", cwd=WEB_ROOT, command=[NPM, "run", "test:secrets"], env=env),
        ReleaseGate(group="web", name="smoke built web app", cwd=WEB_ROOT, command=[NPM, "run", "test:preview"], env=env),
    ]


def flutter_gates() -> list[ReleaseGate]:
    return [
        ReleaseGate(group="flutter", name="install Flutter dependencies", cwd=FLUTTER_ROOT, command=[FLUTTER, "pub", "get"]),
        ReleaseGate(group="flutter", name="analyze Flutter app", cwd=FLUTTER_ROOT, command=[FLUTTER, "analyze"]),
    ]


def build_gates(args: argparse.Namespace) -> list[ReleaseGate]:
    gates: list[ReleaseGate] = []
    if not args.skip_backend:
        gates.extend(
            backend_gates(
                allow_blockers=args.allow_blockers,
                include_docker=args.include_docker,
                use_generated_envs=args.use_generated_envs,
            )
        )
    if not args.skip_web:
        gates.extend(web_gates(args.web_api_base_url))
    if not args.skip_flutter:
        gates.extend(flutter_gates())
    return gates


def render_command(gate: ReleaseGate) -> str:
    env = " ".join(f"{key}={value}" for key, value in sorted(gate.env.items()))
    command = " ".join(gate.command)
    return f"{env} {command}".strip()


def run_gate(gate: ReleaseGate) -> bool:
    print(f"\n[{gate.group}] {gate.name}", flush=True)
    print(f"cwd: {gate.cwd}", flush=True)
    print(f"$ {render_command(gate)}", flush=True)
    env = os.environ.copy()
    env.update({key: value for key, value in gate.env.items() if value is not None})
    try:
        result = subprocess.run(gate.command, cwd=gate.cwd, env=env)
    except FileNotFoundError as exc:
        print(f"FAILED: executable not found: {exc.filename}", flush=True)
        return False
    if result.returncode != 0:
        print(f"FAILED: exit {result.returncode}", flush=True)
        return False
    print("passed", flush=True)
    return True


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run EduConnect cross-project production release gates.")
    parser.add_argument("--allow-blockers", action="store_true", help="Allow known external evidence blockers while still reporting them.")
    parser.add_argument("--dry-run", action="store_true", help="Print the gates that would run without executing them.")
    parser.add_argument("--skip-backend", action="store_true")
    parser.add_argument("--skip-web", action="store_true")
    parser.add_argument("--skip-flutter", action="store_true")
    parser.add_argument("--include-docker", action="store_true", help="Also validate the production Docker Compose config.")
    parser.add_argument(
        "--use-generated-envs",
        action="store_true",
        help="Validate .env.production.generated and .env.staging.generated instead of private promoted env files.",
    )
    parser.add_argument(
        "--web-api-base-url",
        default=os.environ.get("VITE_API_BASE_URL"),
        help="Production web API base URL used for Vite build validation.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    gates = build_gates(args)
    if not gates:
        print("No release gates selected.")
        return 1

    print(f"EduConnect release gates: {len(gates)} selected", flush=True)
    if args.dry_run:
        for gate in gates:
            print(f"- [{gate.group}] {gate.name}: (cd {gate.cwd} && {render_command(gate)})", flush=True)
        return 0

    failures: list[ReleaseGate] = []
    for gate in gates:
        if not run_gate(gate):
            failures.append(gate)

    print("\nEduConnect release gate summary", flush=True)
    print("===============================", flush=True)
    if failures:
        for gate in failures:
            print(f"[FAILED] {gate.group}: {gate.name}", flush=True)
        return 1

    print("All selected release gates passed.", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
