#!/bin/sh
set -eu

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="/backups/facelens_${TIMESTAMP}.sql.gz"

pg_dump | gzip > "${BACKUP_FILE}"
find /backups -name "facelens_*.sql.gz" -type f -mtime +14 -delete

echo "PostgreSQL backup completed: ${BACKUP_FILE}"

