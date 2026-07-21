#!/usr/bin/env bash
set -euo pipefail
: "${BACKUP_DATABASE_URL:?BACKUP_DATABASE_URL is required}"
: "${BACKUP_OUTPUT_DIR:?BACKUP_OUTPUT_DIR is required}"
umask 077
mkdir -p "$BACKUP_OUTPUT_DIR"
stamp="$(date -u +%Y%m%dT%H%M%SZ)"; target="$BACKUP_OUTPUT_DIR/tetrascience-$stamp.dump"
pg_dump --dbname="$BACKUP_DATABASE_URL" --format=custom --no-owner --no-acl --file="$target"
if command -v sha256sum >/dev/null 2>&1; then sha256sum "$target" > "$target.sha256"; else shasum -a 256 "$target" > "$target.sha256"; fi
echo "$target"
