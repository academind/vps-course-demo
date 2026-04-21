#!/usr/bin/env bash
set -Eeuo pipefail

# Live SQLite backup using sqlite3's `.backup` command.
# Edit DB_PATH if your database file lives somewhere else.
#
# Common Docker volume path on Ubuntu:
#   /var/lib/docker/volumes/<volume-name>/_data/ideas.db
#
# Requires:
#   sqlite3
#   sha256sum
#
# Install sqlite3 on Ubuntu:
#   sudo apt-get update
#   sudo apt-get install -y sqlite3

DB_PATH="/var/lib/docker/volumes/vps-demo-app_app_data/_data/ideas.db"
BACKUP_DIR="${HOME}/db-backup"
SQLITE_TIMEOUT_MS=5000

log() {
  printf '[%s] %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*"
}

die() {
  printf 'Error: %s\n' "$*" >&2
  exit 1
}

need_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "Missing required command: $1"
}

need_cmd sqlite3
need_cmd sha256sum

[[ -f "$DB_PATH" ]] || die "DB file not found: $DB_PATH"

umask 077
mkdir -p "$BACKUP_DIR"

DB_BASENAME="$(basename "$DB_PATH")"
if [[ "$DB_BASENAME" == *.* ]]; then
  DB_STEM="${DB_BASENAME%.*}"
  DB_EXT="${DB_BASENAME##*.}"
else
  DB_STEM="$DB_BASENAME"
  DB_EXT="db"
fi

TIMESTAMP="$(date -u +%Y-%m-%dT%H-%M-%SZ)"
TMP_PATH="$BACKUP_DIR/.${DB_STEM}-${TIMESTAMP}.tmp.${DB_EXT}"
FINAL_PATH="$BACKUP_DIR/${DB_STEM}-${TIMESTAMP}.${DB_EXT}"
SHA_PATH="$FINAL_PATH.sha256"
BACKUP_TARGET_ESCAPED="${TMP_PATH//\'/\'\\\'\'}"

cleanup() {
  local rc=$?
  if [[ $rc -ne 0 && -f "$TMP_PATH" ]]; then
    rm -f "$TMP_PATH"
  fi
}
trap cleanup EXIT

sqlite3 -readonly "$DB_PATH" <<EOF
.timeout $SQLITE_TIMEOUT_MS
.backup '$BACKUP_TARGET_ESCAPED'
EOF

RESULT="$(sqlite3 "$TMP_PATH" 'PRAGMA integrity_check;')"
[[ "$RESULT" == "ok" ]] || die "Backup integrity check failed"

mv "$TMP_PATH" "$FINAL_PATH"
sha256sum "$FINAL_PATH" > "$SHA_PATH"

log "Backup created: $FINAL_PATH"
log "Checksum written: $SHA_PATH"