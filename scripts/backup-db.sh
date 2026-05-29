#!/bin/bash
# Maakt een MySQL dump en bewaart de laatste 7 backups.
# Gebruik: ./scripts/backup-db.sh  (vanuit de kassabon-app map)
# Cron (dagelijks om 03:00): 0 3 * * * /pad/naar/kassabon-app/scripts/backup-db.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="$PROJECT_DIR/data/backups"
ENV_FILE="$PROJECT_DIR/.env"

# Laad .env variabelen
if [ -f "$ENV_FILE" ]; then
  export $(grep -v '^#' "$ENV_FILE" | xargs)
fi

mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
FILENAME="kassabon_${TIMESTAMP}.sql.gz"

echo "Backup starten: $FILENAME"

docker compose -f "$PROJECT_DIR/docker-compose.yml" exec -T db \
  mysqldump \
    --user="$DB_USER" \
    --password="$DB_PASSWORD" \
    --single-transaction \
    --routines \
    "$DB_NAME" \
  | gzip > "$BACKUP_DIR/$FILENAME"

echo "Backup opgeslagen: $BACKUP_DIR/$FILENAME"

# Verwijder backups ouder dan 7 dagen
find "$BACKUP_DIR" -name "kassabon_*.sql.gz" -mtime +7 -delete
echo "Oude backups opgeruimd (>7 dagen)"
