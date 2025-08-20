#!/bin/bash

# Cron job setup script for automated backups
# Run this script to set up automated daily backups

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_SCRIPT="$SCRIPT_DIR/backup.sh"

# Make backup script executable
chmod +x "$BACKUP_SCRIPT"

# Create cron job entry
CRON_JOB="0 2 * * * $BACKUP_SCRIPT >> /var/log/backup.log 2>&1"

echo "Setting up automated daily backup at 2:00 AM..."

# Add to crontab if not already present
(crontab -l 2>/dev/null | grep -v "$BACKUP_SCRIPT"; echo "$CRON_JOB") | crontab -

echo "Cron job added successfully:"
echo "$CRON_JOB"
echo ""
echo "Backup logs will be written to: /var/log/backup.log"
echo "To view current cron jobs: crontab -l"
echo "To remove this cron job: crontab -e"
