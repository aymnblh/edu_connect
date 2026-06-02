# EduConnect Restore Drill Log

Record every restore drill here or in the private operations system that mirrors this structure. Do not include production secrets, raw personal data, or backup archive passwords.

Targets:

- RPO <= 6 hours unless a school contract is stricter.
- RTO <= 2 hours unless a school contract is stricter.
- At least one successful drill per month.
- A fresh drill after migrations touching students, grades, attendance, media, auth, or audit tables.

| Date UTC | Operator | Backup Timestamp | Environment | Duration | Result | Findings / Follow-Up |
| --- | --- | --- | --- | --- | --- | --- |
| Pending | Pending | Pending | staging | Pending | Pending | Run before production launch and after each high-risk migration. |

Minimum evidence to keep for each drill:

- Backup archive timestamp and checksum.
- Restore start and finish time.
- `alembic current` and `alembic heads` output after restore.
- `/health` and `/health/ready` result.
- `RUN_DB_TESTS=1` RLS integration test result.
- Confirmation that private media files restored and are only available through authorized endpoints.
- Any data loss window, failed step, or manual recovery action.
