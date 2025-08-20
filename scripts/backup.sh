#!/bin/bash

# PostgreSQL Backup Script for Self-Claim-Link Application
# This script creates automated backups with rotation

set -e

# Configuration
BACKUP_DIR="/backups"
DB_HOST="${POSTGRES_HOST:-localhost}"
DB_PORT="${POSTGRES_PORT:-5432}"
DB_NAME="${POSTGRES_DB:-self_claim_db}"
DB_USER="${POSTGRES_USER:-postgres}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-7}"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Generate timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/backup_${DB_NAME}_${TIMESTAMP}.sql"

echo "Starting backup of database: $DB_NAME"
echo "Backup file: $BACKUP_FILE"

# Create the backup
pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
  --verbose \
  --clean \
  --if-exists \
  --create \
  --format=plain \
  > "$BACKUP_FILE"

# Compress the backup
gzip "$BACKUP_FILE"
BACKUP_FILE="${BACKUP_FILE}.gz"

echo "Backup completed: $BACKUP_FILE"

# Calculate backup size
BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo "Backup size: $BACKUP_SIZE"

# Clean up old backups (keep only last N days)
echo "Cleaning up backups older than $RETENTION_DAYS days..."
find "$BACKUP_DIR" -name "backup_${DB_NAME}_*.sql.gz" -mtime +$RETENTION_DAYS -delete

# List remaining backups
echo "Current backups:"
ls -lah "$BACKUP_DIR"/backup_${DB_NAME}_*.sql.gz 2>/dev/null || echo "No backups found"

echo "Backup process completed successfully"
