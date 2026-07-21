#!/usr/bin/env bash
set -euo pipefail
backup_file="${1:?Usage: verify-backup.sh backup.dump}"
: "${RESTORE_DATABASE_URL:?RESTORE_DATABASE_URL is required}"
if [[ -f "$backup_file.sha256" ]]; then
  if command -v sha256sum >/dev/null 2>&1; then sha256sum -c "$backup_file.sha256" >/dev/null; else shasum -a 256 -c "$backup_file.sha256" >/dev/null; fi
fi
restore_name="$(psql "$RESTORE_DATABASE_URL" -Atc 'select current_database()')"
if [[ ! "$restore_name" =~ _restore_check$ ]]; then echo "Refusing restore: database name must end with _restore_check" >&2; exit 1; fi
pg_restore --list "$backup_file" >/dev/null
pg_restore --dbname="$RESTORE_DATABASE_URL" --clean --if-exists --no-owner --no-acl "$backup_file"
psql "$RESTORE_DATABASE_URL" -v ON_ERROR_STOP=1 -Atc "SELECT CASE WHEN to_regclass('public.tsc_assay_runs') IS NOT NULL AND to_regclass('public.tsc_audit_events') IS NOT NULL AND to_regclass('public.tetrascience_migrations') IS NOT NULL THEN 'restore-ok' ELSE 'restore-failed' END" | grep -qx 'restore-ok'
if [[ -n "${SOURCE_DATABASE_URL:-}" ]]; then
  count_sql="SELECT (SELECT count(*) FROM tsc_tenants),(SELECT count(*) FROM tsc_assay_runs),(SELECT count(*) FROM tsc_measurements),(SELECT count(*) FROM tsc_review_decisions),(SELECT count(*) FROM tsc_audit_events)"
  source_counts="$(psql "$SOURCE_DATABASE_URL" -v ON_ERROR_STOP=1 -AtF, -c "$count_sql")"
  restore_counts="$(psql "$RESTORE_DATABASE_URL" -v ON_ERROR_STOP=1 -AtF, -c "$count_sql")"
  if [[ "$source_counts" != "$restore_counts" ]]; then echo "Restore count mismatch: source=$source_counts restore=$restore_counts" >&2; exit 1; fi
fi
