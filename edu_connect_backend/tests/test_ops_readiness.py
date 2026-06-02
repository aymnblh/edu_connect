import subprocess
import sys
import importlib.util
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def _load_collect_staging_evidence_module():
    spec = importlib.util.spec_from_file_location(
        "collect_staging_evidence",
        ROOT / "scripts" / "collect_staging_evidence.py",
    )
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def _load_validate_launch_evidence_module():
    spec = importlib.util.spec_from_file_location(
        "validate_launch_evidence",
        ROOT / "scripts" / "validate_launch_evidence.py",
    )
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def _load_init_launch_evidence_drafts_module():
    spec = importlib.util.spec_from_file_location(
        "init_launch_evidence_drafts",
        ROOT / "scripts" / "init_launch_evidence_drafts.py",
    )
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def _load_generate_production_env_module():
    spec = importlib.util.spec_from_file_location(
        "generate_production_env",
        ROOT / "scripts" / "generate_production_env.py",
    )
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def _load_run_release_gates_module():
    spec = importlib.util.spec_from_file_location(
        "run_release_gates",
        ROOT.parent / "scripts" / "run_release_gates.py",
    )
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def _load_generate_release_manifest_module():
    spec = importlib.util.spec_from_file_location(
        "generate_release_manifest",
        ROOT.parent / "scripts" / "generate_release_manifest.py",
    )
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def test_staging_parity_template_passes():
    result = subprocess.run(
        [sys.executable, "scripts/check_staging_parity.py", "--allow-placeholders"],
        cwd=ROOT,
        text=True,
        capture_output=True,
        timeout=20,
    )

    assert result.returncode == 0, result.stderr
    assert "staging parity checks passed" in result.stdout


def test_staging_parity_rejects_production_app_env(tmp_path):
    production_env = ROOT / ".env.production.example"
    staging_env = tmp_path / ".env.staging"
    staging_env.write_text(
        (ROOT / ".env.staging.example").read_text(encoding="utf-8").replace(
            "APP_ENV=staging",
            "APP_ENV=production",
        ),
        encoding="utf-8",
    )

    result = subprocess.run(
        [
            sys.executable,
            "scripts/check_staging_parity.py",
            "--allow-placeholders",
            "--production-env",
            str(production_env),
            "--staging-env",
            str(staging_env),
        ],
        cwd=ROOT,
        text=True,
        capture_output=True,
        timeout=20,
    )

    assert result.returncode != 0
    assert "APP_ENV=staging" in result.stderr


def test_backup_and_restore_scripts_preserve_core_safety_controls():
    backup_script = (ROOT / "scripts" / "backup_educonnect.sh").read_text(encoding="utf-8")
    restore_script = (ROOT / "scripts" / "restore_drill.sh").read_text(encoding="utf-8")

    assert "pg_dump" in backup_script
    assert "--format=custom" in backup_script
    assert "database.dump" in backup_script
    assert "database_dump_sha256" in backup_script
    assert "manifest.txt" in backup_script
    assert "find \"$LOCAL_BACKUP_DIR\"" in backup_script

    assert "APP_ENV=production" in restore_script
    assert "Refusing to restore into APP_ENV=production" in restore_script
    assert "pg_restore" in restore_script
    assert "alembic upgrade head" in restore_script
    assert "database ok" in restore_script
    assert "DRILL_REPORT_PATH" in restore_script


def test_operations_docs_name_required_recovery_and_incident_artifacts():
    runbook = (ROOT.parent / "OPERATIONS_RUNBOOK.md").read_text(encoding="utf-8")

    assert "RESTORE_DRILL_LOG.md" in runbook
    assert "INCIDENT_RESPONSE_CONTACTS" in runbook
    assert "production_launch_status.py" in runbook
    assert "collect_staging_evidence.py" in runbook
    assert "validate_launch_evidence.py" in runbook
    assert "check_alembic_release.py" in runbook
    assert "scripts/run_release_gates.py" in runbook
    assert "scripts/generate_release_manifest.py" in runbook
    assert "RELEASE_MANIFEST.md" in runbook
    assert "python -m compileall app alembic tests scripts" in runbook
    assert "export VITE_API_BASE_URL=https://api.educonnect.dz" in runbook
    assert "npm run test:env" in runbook
    assert "npm run check:env" in runbook
    assert "npm run test:secret-scanner" in runbook
    assert "npm run test:secrets" in runbook
    assert "npm run test:preview" in runbook
    assert "STAGING_MIGRATION_EVIDENCE.example.md" in runbook
    assert "STAGING_PARITY_EVIDENCE.example.md" in runbook
    assert "LEGAL_REVIEW_SIGNOFF.example.md" in runbook
    assert "RPO <= 6 hours" in runbook
    assert "RTO <= 2 hours" in runbook


def test_launch_evidence_examples_include_validator_command_labels():
    migration = (ROOT.parent / "STAGING_MIGRATION_EVIDENCE.example.md").read_text(encoding="utf-8")
    parity = (ROOT.parent / "STAGING_PARITY_EVIDENCE.example.md").read_text(encoding="utf-8")

    assert "alembic upgrade head:" in migration
    assert "alembic current after:" in migration
    assert "staging parity config check:" in parity
    assert "staging health:" in parity
    assert "staging readiness:" in parity
    assert "staging PostgreSQL RLS integration tests:" in parity


def test_ci_runs_release_script_and_web_preview_gates():
    workflow = (ROOT.parent / ".github" / "workflows" / "production-readiness.yml").read_text(
        encoding="utf-8"
    )

    assert "python -m compileall app alembic tests scripts" in workflow
    assert "python scripts/check_alembic_release.py --sql-output /tmp/alembic-upgrade-head.sql" in workflow
    assert "python scripts/production_launch_status.py --verify-local --allow-blockers" in workflow
    assert "VITE_API_BASE_URL: https://api.educonnect.dz" in workflow
    assert "npm run test:env" in workflow
    assert "npm run check:env" in workflow
    assert "npm run test:secret-scanner" in workflow
    assert "npm run test:secrets" in workflow
    assert "npm run test:preview" in workflow


def test_root_release_gate_wrapper_selects_all_major_surfaces():
    module = _load_run_release_gates_module()
    args = type(
        "Args",
        (),
        {
            "skip_backend": False,
            "skip_web": False,
            "skip_flutter": False,
            "allow_blockers": True,
            "include_docker": False,
            "use_generated_envs": False,
            "web_api_base_url": "https://api.educonnect.dz",
        },
    )()

    gates = module.build_gates(args)
    gate_names = {gate.name for gate in gates}

    assert "run backend tests" in gate_names
    assert "validate external launch evidence" in gate_names
    assert "report production launch status" in gate_names
    assert "check Alembic release shape" in gate_names
    assert "validate production web env" in gate_names
    assert "scan built web artifacts for secrets" in gate_names
    assert "smoke built web app" in gate_names
    assert "analyze Flutter app" in gate_names
    evidence_gate = next(gate for gate in gates if gate.name == "validate external launch evidence")
    launch_gate = next(gate for gate in gates if gate.name == "report production launch status")
    assert "--allow-missing" in evidence_gate.command
    assert "--allow-blockers" in launch_gate.command


def test_root_release_gate_wrapper_can_use_generated_envs():
    module = _load_run_release_gates_module()
    args = type(
        "Args",
        (),
        {
            "skip_backend": False,
            "skip_web": True,
            "skip_flutter": True,
            "allow_blockers": True,
            "include_docker": False,
            "use_generated_envs": True,
            "web_api_base_url": "https://api.educonnect.dz",
        },
    )()

    gates = module.build_gates(args)
    gate_names = {gate.name for gate in gates}

    assert "check production posture" in gate_names
    assert "check staging parity generated envs" in gate_names
    assert "review generated env readiness" in gate_names
    posture_gate = next(gate for gate in gates if gate.name == "check production posture")
    parity_gate = next(gate for gate in gates if gate.name == "check staging parity generated envs")
    assert ".env.production.generated" in posture_gate.command
    assert ".env.production.generated" in parity_gate.command
    assert ".env.staging.generated" in parity_gate.command


def test_alembic_release_check_generates_sql(tmp_path):
    sql_output = tmp_path / "alembic-upgrade-head.sql"

    result = subprocess.run(
        [
            sys.executable,
            "scripts/check_alembic_release.py",
            "--sql-output",
            str(sql_output),
        ],
        cwd=ROOT,
        text=True,
        capture_output=True,
        timeout=60,
    )

    assert result.returncode == 0, result.stdout + result.stderr
    assert "Alembic release checks passed" in result.stdout
    generated_sql = sql_output.read_text(encoding="utf-8")
    assert "CREATE TABLE alembic_version" in generated_sql
    assert "INSERT INTO alembic_version" in generated_sql


def test_web_gitignore_protects_real_environment_files():
    gitignore = (ROOT.parent / "edu_connect_web" / ".gitignore").read_text(encoding="utf-8")

    assert ".env" in gitignore
    assert ".env.*" in gitignore
    assert "!.env.example" in gitignore
    assert "!.env.production.example" in gitignore


def test_backend_gitignore_protects_real_environment_files():
    gitignore = (ROOT / ".gitignore").read_text(encoding="utf-8")

    assert ".env" in gitignore
    assert ".env.*" in gitignore
    assert "!.env.example" in gitignore
    assert "!.env.*.example" in gitignore


def test_generate_production_env_replaces_all_secret_placeholders(tmp_path):
    module = _load_generate_production_env_module()
    template = (ROOT / ".env.production.example").read_text(encoding="utf-8")
    values = {
        "POSTGRES_SUPERUSER_PASSWORD": "postgres-secret-value-with-32-plus-chars",
        "APP_DB_PASSWORD": "app-secret-value-with-32-plus-chars",
        "PLATFORM_SECRET": "platform-secret-value-with-32-plus-chars",
        "SERVER_FINGERPRINT_SALT": "fingerprint-salt-value-with-32-plus-chars",
        "NTFY_AUTH_TOKEN": "ntfy-token-value-with-32-plus-chars",
    }

    rendered = module.render_generated_env(template, values)
    output = tmp_path / ".env.production.generated"
    output.write_text(rendered, encoding="utf-8")

    assert module.validate_generated_env(rendered) == []
    assert "YOUR_" not in rendered
    assert "REPLACE_WITH" not in rendered
    assert values["APP_DB_PASSWORD"] in module.env_values(rendered)["DATABASE_URL"]

    result = subprocess.run(
        [
            sys.executable,
            "scripts/check_production_posture.py",
            "--actual-env",
            str(output),
        ],
        cwd=ROOT,
        text=True,
        capture_output=True,
        timeout=20,
    )

    assert result.returncode == 0, result.stderr
    assert "production posture checks passed" in result.stdout


def test_generate_staging_env_replaces_placeholders_and_preserves_parity(tmp_path):
    module = _load_generate_production_env_module()
    prod_template = (ROOT / ".env.production.example").read_text(encoding="utf-8")
    staging_template = (ROOT / ".env.staging.example").read_text(encoding="utf-8")

    prod = module.render_generated_env(prod_template)
    staging = module.render_generated_env(staging_template)
    production_env = tmp_path / ".env.production"
    staging_env = tmp_path / ".env.staging"
    production_env.write_text(prod, encoding="utf-8")
    staging_env.write_text(staging, encoding="utf-8")

    assert module.validate_generated_env(prod) == []
    assert module.validate_generated_env(staging) == []
    assert "YOUR_" not in staging
    assert "REPLACE_WITH" not in staging
    assert module.env_values(prod)["APP_DB_PASSWORD"] != module.env_values(staging)["APP_DB_PASSWORD"]
    assert module.env_values(prod)["PLATFORM_SECRET"] != module.env_values(staging)["PLATFORM_SECRET"]

    result = subprocess.run(
        [
            sys.executable,
            "scripts/check_staging_parity.py",
            "--production-env",
            str(production_env),
            "--staging-env",
            str(staging_env),
        ],
        cwd=ROOT,
        text=True,
        capture_output=True,
        timeout=20,
    )

    assert result.returncode == 0, result.stderr
    assert "staging parity checks passed" in result.stdout


def test_env_readiness_review_redacts_secrets(tmp_path):
    module = _load_generate_production_env_module()
    prod_template = (ROOT / ".env.production.example").read_text(encoding="utf-8")
    staging_template = (ROOT / ".env.staging.example").read_text(encoding="utf-8")
    production_secret = "prod-platform-secret-value-with-32-plus-chars"
    staging_secret = "staging-platform-secret-value-with-32-plus-chars"

    prod = module.render_generated_env(
        prod_template,
        {
            "POSTGRES_SUPERUSER_PASSWORD": "prod-postgres-secret-value-with-32-plus-chars",
            "APP_DB_PASSWORD": "prod-app-secret-value-with-32-plus-chars",
            "PLATFORM_SECRET": production_secret,
            "SERVER_FINGERPRINT_SALT": "prod-fingerprint-salt-value-with-32-plus-chars",
            "NTFY_AUTH_TOKEN": "prod-ntfy-token-value-with-32-plus-chars",
        },
    )
    staging = module.render_generated_env(
        staging_template,
        {
            "POSTGRES_SUPERUSER_PASSWORD": "staging-postgres-secret-value-with-32-plus-chars",
            "APP_DB_PASSWORD": "staging-app-secret-value-with-32-plus-chars",
            "PLATFORM_SECRET": staging_secret,
            "SERVER_FINGERPRINT_SALT": "staging-fingerprint-salt-value-with-32-plus-chars",
            "NTFY_AUTH_TOKEN": "staging-ntfy-token-value-with-32-plus-chars",
        },
    )
    production_env = tmp_path / ".env.production"
    staging_env = tmp_path / ".env.staging"
    production_env.write_text(prod, encoding="utf-8")
    staging_env.write_text(staging, encoding="utf-8")

    result = subprocess.run(
        [
            sys.executable,
            "scripts/review_env_readiness.py",
            "--production-env",
            str(production_env),
            "--staging-env",
            str(staging_env),
        ],
        cwd=ROOT,
        text=True,
        capture_output=True,
        timeout=20,
    )

    assert result.returncode == 0, result.stderr
    assert "Result: PASS" in result.stdout
    assert "fingerprint=" in result.stdout
    assert "<redacted>" in result.stdout
    assert production_secret not in result.stdout
    assert staging_secret not in result.stdout
    assert "prod-app-secret-value-with-32-plus-chars" not in result.stdout
    assert "staging-app-secret-value-with-32-plus-chars" not in result.stdout


def test_promote_generated_envs_dry_run_does_not_write_targets(tmp_path):
    module = _load_generate_production_env_module()
    production_source = tmp_path / ".env.production.generated"
    staging_source = tmp_path / ".env.staging.generated"
    production_target = tmp_path / ".env.production"
    staging_target = tmp_path / ".env.staging"
    production_source.write_text(
        module.render_generated_env((ROOT / ".env.production.example").read_text(encoding="utf-8")),
        encoding="utf-8",
    )
    staging_source.write_text(
        module.render_generated_env((ROOT / ".env.staging.example").read_text(encoding="utf-8")),
        encoding="utf-8",
    )

    result = subprocess.run(
        [
            sys.executable,
            "scripts/promote_generated_envs.py",
            "--production-source",
            str(production_source),
            "--staging-source",
            str(staging_source),
            "--production-target",
            str(production_target),
            "--staging-target",
            str(staging_target),
        ],
        cwd=ROOT,
        text=True,
        capture_output=True,
        timeout=20,
    )

    assert result.returncode == 0, result.stderr
    assert "Dry run only" in result.stdout
    assert not production_target.exists()
    assert not staging_target.exists()


def test_promote_generated_envs_apply_writes_targets_and_backups(tmp_path):
    module = _load_generate_production_env_module()
    production_source = tmp_path / ".env.production.generated"
    staging_source = tmp_path / ".env.staging.generated"
    production_target = tmp_path / ".env.production"
    staging_target = tmp_path / ".env.staging"
    production_target.write_text("APP_ENV=production\nPLATFORM_SECRET=old\n", encoding="utf-8")
    staging_target.write_text("APP_ENV=staging\nPLATFORM_SECRET=old\n", encoding="utf-8")
    production_source.write_text(
        module.render_generated_env((ROOT / ".env.production.example").read_text(encoding="utf-8")),
        encoding="utf-8",
    )
    staging_source.write_text(
        module.render_generated_env((ROOT / ".env.staging.example").read_text(encoding="utf-8")),
        encoding="utf-8",
    )

    result = subprocess.run(
        [
            sys.executable,
            "scripts/promote_generated_envs.py",
            "--production-source",
            str(production_source),
            "--staging-source",
            str(staging_source),
            "--production-target",
            str(production_target),
            "--staging-target",
            str(staging_target),
            "--apply",
        ],
        cwd=ROOT,
        text=True,
        capture_output=True,
        timeout=20,
    )

    assert result.returncode == 0, result.stderr
    assert "Promotion complete" in result.stdout
    assert "YOUR_" not in production_target.read_text(encoding="utf-8")
    assert "REPLACE_WITH" not in staging_target.read_text(encoding="utf-8")
    assert list(tmp_path.glob(".env.production.backup.*"))
    assert list(tmp_path.glob(".env.staging.backup.*"))


def test_root_gitignore_protects_generated_release_manifest():
    gitignore = (ROOT.parent / ".gitignore").read_text(encoding="utf-8")

    assert "RELEASE_MANIFEST.md" in gitignore


def test_release_manifest_generator_records_core_fingerprints(tmp_path):
    output = tmp_path / "RELEASE_MANIFEST.md"

    result = subprocess.run(
        [
            sys.executable,
            str(ROOT.parent / "scripts" / "generate_release_manifest.py"),
            "--output",
            str(output),
            "--web-api-base-url",
            "https://api.educonnect.dz",
        ],
        cwd=ROOT.parent,
        text=True,
        capture_output=True,
        timeout=60,
    )

    assert result.returncode == 0, result.stdout + result.stderr
    manifest = output.read_text(encoding="utf-8")
    assert "# EduConnect Release Manifest" in manifest
    assert "Alembic head:" in manifest
    assert "20260520_0008" in manifest
    assert "Web API base URL: https://api.educonnect.dz" in manifest
    assert "Source fingerprint:" in manifest
    assert "Web dist fingerprint:" in manifest
    assert "LAUNCH_EVIDENCE_COLLECTION_GUIDE.md" in manifest
    assert "scripts/run_release_gates.py" in manifest
    assert "edu_connect_backend/scripts/init_launch_evidence_drafts.py" in manifest
    assert "edu_connect_backend/scripts/promote_generated_envs.py" in manifest
    assert "--use-generated-envs" in manifest
    assert "edu_connect_backend/requirements.txt" in manifest
    assert "20260520_0008_student_retention_lifecycle.py" in manifest
    assert "__pycache__" not in manifest
    assert ".pyc" not in manifest
    assert "index.html" in manifest
    assert "SHA-256" in manifest


def test_launch_status_reports_external_blockers_without_faking_signoff():
    result = subprocess.run(
        [sys.executable, "scripts/production_launch_status.py"],
        cwd=ROOT,
        text=True,
        capture_output=True,
        timeout=20,
    )

    assert result.returncode == 1
    assert "Remaining launch blockers" in result.stdout
    assert "STAGING_MIGRATION_EVIDENCE.md" in result.stdout
    assert "LEGAL_REVIEW_SIGNOFF.md" not in result.stdout
    assert "INCIDENT_RESPONSE_CONTACTS.md" not in result.stdout
    assert "STAGING_PARITY_EVIDENCE.md" in result.stdout
    assert "Evidence status: incomplete" in result.stdout


def test_launch_status_can_run_fast_local_gates():
    result = subprocess.run(
        [
            sys.executable,
            "scripts/production_launch_status.py",
            "--verify-local",
            "--allow-blockers",
        ],
        cwd=ROOT,
        text=True,
        capture_output=True,
        timeout=60,
    )

    assert result.returncode == 0, result.stderr
    assert "Local posture/key/parity-template gates passed." in result.stdout


def test_launch_status_can_run_generated_env_local_gates():
    result = subprocess.run(
        [
            sys.executable,
            "scripts/production_launch_status.py",
            "--verify-local",
            "--use-generated-envs",
            "--allow-blockers",
        ],
        cwd=ROOT,
        text=True,
        capture_output=True,
        timeout=60,
    )

    assert result.returncode == 0, result.stderr
    assert "Local generated-env/key gates passed." in result.stdout
    assert "Remaining launch blockers" in result.stdout


def test_collect_staging_evidence_dry_run_does_not_write_private_files(tmp_path):
    result = subprocess.run(
        [
            sys.executable,
            "scripts/collect_staging_evidence.py",
            "--production-env",
            ".env.production.example",
            "--staging-env",
            ".env.staging.example",
            "--evidence-dir",
            str(tmp_path),
            "--dry-run",
        ],
        cwd=ROOT,
        text=True,
        capture_output=True,
        timeout=20,
    )

    assert result.returncode == 0, result.stderr
    assert "Dry run" in result.stdout
    assert "alembic upgrade head" in result.stdout
    assert not (tmp_path / "STAGING_MIGRATION_EVIDENCE.md").exists()
    assert not (tmp_path / "STAGING_PARITY_EVIDENCE.md").exists()


def test_collect_staging_evidence_refuses_production_staging_env(tmp_path):
    staging_env = tmp_path / ".env.staging"
    staging_env.write_text(
        (ROOT / ".env.staging.example").read_text(encoding="utf-8").replace(
            "APP_ENV=staging",
            "APP_ENV=production",
        ),
        encoding="utf-8",
    )

    result = subprocess.run(
        [
            sys.executable,
            "scripts/collect_staging_evidence.py",
            "--production-env",
            ".env.production.example",
            "--staging-env",
            str(staging_env),
            "--dry-run",
        ],
        cwd=ROOT,
        text=True,
        capture_output=True,
        timeout=20,
    )

    assert result.returncode == 1
    assert "APP_ENV=staging" in result.stderr


def test_collect_staging_evidence_renders_pass_evidence_shape():
    module = _load_collect_staging_evidence_module()
    command_result = module.CommandResult(
        name="alembic current after",
        command="alembic current",
        returncode=0,
        stdout="20260520_0008",
        stderr="",
        duration_seconds=1.25,
    )

    rendered = module.render_migration_evidence(
        generated_at="2026-05-21T00:00:00Z",
        operator="operator-a",
        source_backup_timestamp="2026-05-21T00:00:00Z",
        source_backup_checksum="abc123",
        staging_database="edu_connect_staging",
        app_image_tag="staging-1",
        started_at="2026-05-21T00:00:00Z",
        duration_seconds=2.5,
        results=[command_result],
    )

    assert "Result: PASS" in rendered
    assert "Source backup checksum: abc123" in rendered
    assert "alembic current after" in rendered
    assert "20260520_0008" in rendered


def test_validate_launch_evidence_reports_missing_files(tmp_path):
    module = _load_validate_launch_evidence_module()

    results = module.validate_all(tmp_path)

    assert set(results) == {
        "staging migration",
        "legal review",
        "incident contacts",
        "staging parity",
    }
    assert all(failures for failures in results.values())
    assert all("missing evidence file" in failures[0] for failures in results.values())


def test_init_launch_evidence_drafts_dry_run_does_not_write_private_files(tmp_path):
    result = subprocess.run(
        [
            sys.executable,
            "scripts/init_launch_evidence_drafts.py",
            "--template-root",
            str(ROOT.parent),
            "--evidence-root",
            str(tmp_path),
        ],
        cwd=ROOT,
        text=True,
        capture_output=True,
        timeout=20,
    )

    assert result.returncode == 0, result.stderr
    assert "Dry run only" in result.stdout
    assert "Would create" in result.stdout
    assert not (tmp_path / "STAGING_MIGRATION_EVIDENCE.md").exists()
    assert not (tmp_path / "STAGING_PARITY_EVIDENCE.md").exists()
    assert not (tmp_path / "LEGAL_REVIEW_SIGNOFF.md").exists()
    assert not (tmp_path / "INCIDENT_RESPONSE_CONTACTS.md").exists()


def test_init_launch_evidence_drafts_write_copies_examples(tmp_path):
    result = subprocess.run(
        [
            sys.executable,
            "scripts/init_launch_evidence_drafts.py",
            "--template-root",
            str(ROOT.parent),
            "--evidence-root",
            str(tmp_path),
            "--write",
        ],
        cwd=ROOT,
        text=True,
        capture_output=True,
        timeout=20,
    )

    assert result.returncode == 0, result.stderr
    assert "Draft initialization complete" in result.stdout
    assert (tmp_path / "STAGING_MIGRATION_EVIDENCE.md").read_text(encoding="utf-8") == (
        ROOT.parent / "STAGING_MIGRATION_EVIDENCE.example.md"
    ).read_text(encoding="utf-8")
    assert (tmp_path / "STAGING_PARITY_EVIDENCE.md").exists()
    assert (tmp_path / "LEGAL_REVIEW_SIGNOFF.md").exists()
    assert (tmp_path / "INCIDENT_RESPONSE_CONTACTS.md").exists()


def test_init_launch_evidence_drafts_preserves_existing_files(tmp_path):
    module = _load_init_launch_evidence_drafts_module()
    legal_file = tmp_path / "LEGAL_REVIEW_SIGNOFF.md"
    legal_file.write_text("real review work in progress\n", encoding="utf-8")

    report, exit_code = module.initialize_drafts(
        template_root=ROOT.parent,
        evidence_root=tmp_path,
        write=True,
        overwrite=False,
    )

    assert exit_code == 0
    assert "[SKIP]" in report
    assert legal_file.read_text(encoding="utf-8") == "real review work in progress\n"
    assert (tmp_path / "STAGING_MIGRATION_EVIDENCE.md").exists()


def test_init_launch_evidence_drafts_do_not_satisfy_validation(tmp_path):
    result = subprocess.run(
        [
            sys.executable,
            "scripts/init_launch_evidence_drafts.py",
            "--template-root",
            str(ROOT.parent),
            "--evidence-root",
            str(tmp_path),
            "--write",
        ],
        cwd=ROOT,
        text=True,
        capture_output=True,
        timeout=20,
    )
    assert result.returncode == 0, result.stderr

    validation = subprocess.run(
        [
            sys.executable,
            "scripts/validate_launch_evidence.py",
            "--evidence-root",
            str(tmp_path),
        ],
        cwd=ROOT,
        text=True,
        capture_output=True,
        timeout=20,
    )

    assert validation.returncode == 1
    assert "[BLOCKED] staging migration" in validation.stdout
    assert "[BLOCKED] legal review" in validation.stdout
    assert "placeholders" in validation.stdout or "missing" in validation.stdout


def test_validate_launch_evidence_rejects_placeholders(tmp_path):
    module = _load_validate_launch_evidence_module()
    legal_file = tmp_path / "LEGAL_REVIEW_SIGNOFF.md"
    legal_file.write_text(
        """
# EduConnect Legal / Privacy Review Sign-Off

- Date/time UTC: 2026-05-21T00:00:00Z
- Reviewer name: YOUR_REVIEWER
- Reviewer role / organization: Pending
- Jurisdictions reviewed: Algeria
- Applicable school contracts reviewed: Standard EduConnect DPA
- Algerian Law 18-07 / ANPDP obligations reviewed: YES / NO
- Data processing roles documented: YES
- Data retention policy approved: YES
- Parent/student export process approved: YES
- Deletion/archive process approved: YES
- Incident notification thresholds approved: YES
- Terms/privacy notice version: v1
- Result: APPROVED / APPROVED WITH CONDITIONS / NOT APPROVED
- Conditions before launch: none
- Next review date: 2026-08-21
""".strip(),
        encoding="utf-8",
    )

    failures = module.validate_legal_review(legal_file)

    assert any("placeholders" in failure for failure in failures)
    assert any("Algerian Law 18-07 / ANPDP obligations reviewed" in failure for failure in failures)
    assert any("result must be exactly APPROVED" in failure for failure in failures)


def test_validate_launch_evidence_accepts_complete_evidence_set(tmp_path):
    (tmp_path / "STAGING_MIGRATION_EVIDENCE.md").write_text(
        """
# EduConnect Staging Migration Evidence

- Date/time UTC: 2026-05-21T00:00:00Z
- Operator: Release Owner
- Source backup timestamp: 2026-05-21T00:00:00Z
- Source backup checksum: sha256:abc123
- Staging database host: staging-db.internal
- Staging app image/tag: educonnect-api:2026.05.21
- Alembic revision before upgrade: 20260520_0008
- Alembic revision after upgrade: 20260521_0009
- Migration command: alembic upgrade head
- Result: PASS
- Duration: 42s

## Command Evidence

- alembic upgrade head: exit 0
- alembic current after: 20260521_0009
""".strip(),
        encoding="utf-8",
    )
    (tmp_path / "STAGING_PARITY_EVIDENCE.md").write_text(
        """
# EduConnect Staging Parity Evidence

- Date/time UTC: 2026-05-21T00:00:00Z
- Operator: Release Owner
- Staging API URL: https://staging-api.educonnect.example
- Staging web URL: https://staging-app.educonnect.example
- Staging database version: PostgreSQL 16.3
- Staging app database role includes `NOBYPASSRLS`: YES
- Staging uses RS256 keys distinct from production: YES
- Staging Redis/rate-limit behavior verified: YES
- Staging ClamAV mode matches production: YES
- Staging private media authorization verified: YES
- Staging ntfy topics are staging-only: YES
- Result: PASS

## Command Evidence

- staging parity config check: exit 0
- staging health: exit 0
- staging readiness: exit 0
- staging PostgreSQL RLS integration tests: exit 0
""".strip(),
        encoding="utf-8",
    )
    (tmp_path / "LEGAL_REVIEW_SIGNOFF.md").write_text(
        """
# EduConnect Legal / Privacy Review Sign-Off

- Date/time UTC: 2026-05-21T00:00:00Z
- Reviewer name: Boulahia Walid
- Reviewer role / organization: Avocat, Walid Boulahia
- Jurisdictions reviewed: Algeria
- Applicable school contracts reviewed: Standard Wasel Edu school SaaS contract
- Algerian Law 18-07 / ANPDP obligations reviewed: YES
- Data processing roles documented: YES
- Data retention policy approved: YES
- Parent/student export process approved: YES
- Deletion/archive process approved: YES
- Incident notification thresholds approved: YES
- Terms/privacy notice version: v1.0
- Result: APPROVED
- Conditions before launch: none
- Next review date: 2026-08-21
""".strip(),
        encoding="utf-8",
    )
    (tmp_path / "INCIDENT_RESPONSE_CONTACTS.md").write_text(
        """
# EduConnect Incident Response Contacts

## Primary Roster

| Role | Name | Primary Contact | Backup Contact | Availability | Notes |
| --- | --- | --- | --- | --- | --- |
| Incident commander | Amina R. | +33100000001 | +33100000002 | 24/7 | Owns severity and communications. |
| Backend owner | Sami B. | +33100000003 | +33100000004 | 24/7 | Owns API rollback. |
| Database owner | Nadia C. | +33100000005 | +33100000006 | 24/7 | Owns restore and RLS verification. |
| Infrastructure owner | Leo D. | +33100000007 | +33100000008 | 24/7 | Owns host, DNS, TLS, and backups. |
| School/customer contact | Nora E. | +33100000009 | +33100000010 | Business hours plus SEV1 | Owns tenant notification. |
| Legal/privacy contact | Camille M. | +33100000011 | +33100000012 | 24/7 for SEV1 | Owns notification obligations. |

## Escalation Path

| Severity | Escalate Within | Required Contacts | Communication Cadence |
| --- | --- | --- | --- |
| SEV1 | 15 minutes | Incident commander, backend owner, database owner, infrastructure owner, legal/privacy contact, affected school owner | Every 30 minutes until contained |
| SEV2 | 30 minutes | Incident commander, responsible technical owner, affected school owner when user-visible | Every 2 hours until mitigated |
| SEV3 | 1 business day | Responsible technical owner | Daily until closed |
""".strip(),
        encoding="utf-8",
    )

    result = subprocess.run(
        [
            sys.executable,
            "scripts/validate_launch_evidence.py",
            "--evidence-root",
            str(tmp_path),
        ],
        cwd=ROOT,
        text=True,
        capture_output=True,
        timeout=20,
    )

    assert result.returncode == 0, result.stdout + result.stderr
    assert "[PASS] staging migration" in result.stdout
    assert "[PASS] legal review" in result.stdout
    assert "[PASS] incident contacts" in result.stdout
    assert "[PASS] staging parity" in result.stdout
