#!/bin/bash

# PostgreSQL Restore Script for Self-Claim-Link-2 Application
# This script restores database from backup files

set -e

# Configuration
BACKUP_DIR="/backups"
DB_HOST="${POSTGRES_HOST:-localhost}"
DB_PORT="${POSTGRES_PORT:-5432}"
DB_NAME="${POSTGRES_DB:-self_claim_db}"
DB_USER="${POSTGRES_USER:-postgres}"

# Function to show usage
show_usage() {
    echo "Usage: $0 [backup_file]"
    echo ""
    echo "If no backup file is specified, the most recent backup will be used."
    echo ""
    echo "Available backups:"
    ls -lah "$BACKUP_DIR"/backup_${DB_NAME}_*.sql.gz 2>/dev/null || echo "No backups found"
    exit 1
}

# Get backup file
if [ $# -eq 0 ]; then
    # Use most recent backup
    BACKUP_FILE=$(ls -t "$BACKUP_DIR"/backup_${DB_NAME}_*.sql.gz 2>/dev/null | head -n1)
    if [ -z "$BACKUP_FILE" ]; then
        echo "Error: No backup files found in $BACKUP_DIR"
        show_usage
    fi
    echo "Using most recent backup: $BACKUP_FILE"
elif [ $# -eq 1 ]; then
    BACKUP_FILE="$1"
    if [ ! -f "$BACKUP_FILE" ]; then
        echo "Error: Backup file not found: $BACKUP_FILE"
        show_usage
    fi
else
    show_usage
fi

# Confirm restore operation
echo "WARNING: This will completely replace the current database: $DB_NAME"
echo "Backup file: $BACKUP_FILE"
echo ""
read -p "Are you sure you want to continue? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "Restore cancelled."
    exit 0
fi

echo "Starting restore of database: $DB_NAME"
echo "From backup: $BACKUP_FILE"

# Check if backup file is compressed
if [[ "$BACKUP_FILE" == *.gz ]]; then
    echo "Decompressing backup file..."
    gunzip -c "$BACKUP_FILE" | psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres
else
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres < "$BACKUP_FILE"
fi

echo "Database restore completed successfully"
echo "Database $DB_NAME has been restored from $BACKUP_FILE"
