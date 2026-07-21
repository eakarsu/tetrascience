# Operations, observability, and recovery

## Release order

1. Back up the database and verify the resulting custom archive in a disposable database whose name ends `_restore_check`.
2. Run `npm run migrate` as a one-shot job under an advisory lock.
3. Start the API; route traffic only after `/api/ready` succeeds.
4. Start the static UI and validate one source-bound instrument in each tenant.

Schema synchronization and seed execution are prohibited at application startup. `npm run migrate:down` rolls back only the latest migration and should run only with writers stopped and an approved recovery plan.

## Signals and alerts

The API emits bounded JSON request logs containing request ID, method, path, status, and latency; payloads and credentials are never logged. `/api/metrics` returns uptime, request/error counts, and average latency. Alert on readiness failure, database pool exhaustion, 5xx rates, authentication lockouts, rejected/error ingestion growth, calibration expiry, quarantined backlog, submitted aging, broken audit verification, and backup/restore failure.

## Backup exercise

Create an encrypted-at-rest archive with:

`BACKUP_DATABASE_URL=... BACKUP_OUTPUT_DIR=/approved/path backend/scripts/backup.sh`

Create a separate empty database ending `_restore_check`, then run:

`RESTORE_DATABASE_URL=... backend/scripts/verify-backup.sh /approved/path/archive.dump`

The check refuses other database names, restores with ownership/ACL removed, and verifies migration, assay, and audit tables. After restore, also authenticate, inspect released evidence, verify each tenant audit chain, compare counts/checksums to the source, and then destroy the disposable restore database through the approved database workflow.

## Incident recovery

Retain the source record ID when retrying transient failures. Do not edit immutable evidence. Correct quarantined data with a new source event and `revisionOfRunId`. Suspend a compromised identity or tenant at the database/identity administration layer, rotate JWT/database credentials, invalidate ingress sessions, and reconcile audit/request logs.
