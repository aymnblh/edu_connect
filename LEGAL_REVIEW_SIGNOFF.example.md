# EduConnect Legal / Privacy Review Sign-Off

Keep the completed `LEGAL_REVIEW_SIGNOFF.md` in the private operations vault or private legal repository. Do not commit attorney-client privileged notes or sensitive student data.

## Required Fields

- Date/time UTC:
- Reviewer name:
- Reviewer role / organization:
- Jurisdictions reviewed:
- Applicable school contracts reviewed:
- Algerian Law 18-07 / ANPDP obligations reviewed: YES / NO
- Data processing roles documented: YES / NO
- Data retention policy approved: YES / NO
- Parent/student export process approved: YES / NO
- Deletion/archive process approved: YES / NO
- Incident notification thresholds approved: YES / NO
- Terms/privacy notice version:
- Result: APPROVED / APPROVED WITH CONDITIONS / NOT APPROVED
- Conditions before launch:
- Next review date:

## Engineering Materials For Review

- `SECURITY_PRIVACY_POLICY.md`
- `PRODUCTION_READINESS_CHECKLIST.md`
- `OPERATIONS_RUNBOOK.md`
- `RESTORE_DRILL_LOG.md`
- RLS migrations under `edu_connect_backend/alembic/versions`
- Audit/export endpoints under `edu_connect_backend/app/modules/core/routers/security.py`
