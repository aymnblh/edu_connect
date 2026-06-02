# EduConnect Incident Response Contacts

Keep the completed version of this roster in the private operations vault, not in the public repository. Update it quarterly and after any personnel or vendor change.

## Primary Roster

| Role | Name | Primary Contact | Backup Contact | Availability | Notes |
| --- | --- | --- | --- | --- | --- |
| Incident commander | TODO | TODO | TODO | TODO | Owns timeline, severity, and communications cadence. |
| Backend owner | TODO | TODO | TODO | TODO | Owns API, auth, messaging, audit, and application rollback. |
| Database owner | TODO | TODO | TODO | TODO | Owns PostgreSQL restore, RLS verification, and migration recovery. |
| Infrastructure owner | TODO | TODO | TODO | TODO | Owns Docker host, Traefik, DNS, TLS, storage, and backups. |
| School/customer contact | TODO | TODO | TODO | TODO | Owns tenant notification and school-side coordination. |
| Legal/privacy contact | TODO | TODO | TODO | TODO | Owns Algerian personal data protection and incident notification obligations. |

## Escalation Path

| Severity | Escalate Within | Required Contacts | Communication Cadence |
| --- | --- | --- | --- |
| SEV1 | 15 minutes | Incident commander, backend owner, database owner, infrastructure owner, legal/privacy contact, affected school owner | Every 30 minutes until contained |
| SEV2 | 30 minutes | Incident commander, responsible technical owner, affected school owner when user-visible | Every 2 hours until mitigated |
| SEV3 | 1 business day | Responsible technical owner | Daily until closed |

## External Dependencies

| Service | Account / Console | Support Channel | Escalation Notes |
| --- | --- | --- | --- |
| VPS / infrastructure provider | TODO | TODO | Include account ID and emergency support URL. |
| Domain / DNS provider | TODO | TODO | Include registrar login owner. |
| Backup storage provider | TODO | TODO | Include restore credential location. |
| Email / notification provider | TODO | TODO | Include sender domain owner. |

## Required Incident Record

For every SEV1/SEV2, record:

- Start time, detection source, and severity.
- Affected schools, users, tables, files, and endpoints.
- Whether data exposure, data loss, or auth compromise is suspected or confirmed.
- Containment actions, including disabled routes, revoked sessions, and rotated secrets.
- Audit export location and immutable snapshot location.
- User/school/legal notification decision and timestamp.
- Root cause, corrective action, and prevention action.
