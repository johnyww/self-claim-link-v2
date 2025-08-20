#!/bin/bash

# Backup Health Check Script
# Monitors backup status and sends alerts if backups are failing

set -e

BACKUP_DIR="/backups"
DB_NAME="${POSTGRES_DB:-self_claim_db}"
MAX_BACKUP_AGE_HOURS="${MAX_BACKUP_AGE_HOURS:-25}" # 25 hours allows for some delay
ALERT_EMAIL="${BACKUP_ALERT_EMAIL:-}"

echo "Checking backup health for database: $DB_NAME"

# Find the most recent backup
LATEST_BACKUP=$(ls -t "$BACKUP_DIR"/backup_${DB_NAME}_*.sql.gz 2>/dev/null | head -n1)

if [ -z "$LATEST_BACKUP" ]; then
    echo "ERROR: No backup files found!"
    exit 1
fi

# Check backup age
BACKUP_TIME=$(stat -c %Y "$LATEST_BACKUP")
CURRENT_TIME=$(date +%s)
BACKUP_AGE_SECONDS=$((CURRENT_TIME - BACKUP_TIME))
BACKUP_AGE_HOURS=$((BACKUP_AGE_SECONDS / 3600))

echo "Latest backup: $LATEST_BACKUP"
echo "Backup age: $BACKUP_AGE_HOURS hours"

if [ $BACKUP_AGE_HOURS -gt $MAX_BACKUP_AGE_HOURS ]; then
    echo "WARNING: Backup is older than $MAX_BACKUP_AGE_HOURS hours!"
    
    # Send alert email if configured
    if [ -n "$ALERT_EMAIL" ]; then
        echo "Backup Alert: Latest backup for $DB_NAME is $BACKUP_AGE_HOURS hours old" | \
        mail -s "Backup Alert: $DB_NAME" "$ALERT_EMAIL"
    fi
    
    exit 1
else
    echo "Backup health check: PASSED"
fi

# Check backup file integrity
echo "Checking backup file integrity..."
if gunzip -t "$LATEST_BACKUP" 2>/dev/null; then
    echo "Backup file integrity: PASSED"
else
    echo "ERROR: Backup file is corrupted!"
    exit 1
fi

# Check backup size (should be reasonable)
BACKUP_SIZE=$(stat -c %s "$LATEST_BACKUP")
MIN_SIZE=1024  # 1KB minimum

if [ $BACKUP_SIZE -lt $MIN_SIZE ]; then
    echo "WARNING: Backup file size is suspiciously small: $BACKUP_SIZE bytes"
    exit 1
else
    echo "Backup file size: $BACKUP_SIZE bytes - OK"
fi

echo "All backup health checks passed!"
exit 0
