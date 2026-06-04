#!/bin/bash
TARGET_EPOCH=$(TZ='Europe/Rome' date -d "2026-05-31 23:59:00" +%s)
NOW_EPOCH=$(date +%s)
DELAY_SEC=$((TARGET_EPOCH - NOW_EPOCH))
if [ $DELAY_SEC -gt 0 ]; then
  echo "Sleeping $DELAY_SEC seconds until 23:59 Rome time..." >> /home/z/my-project/logs/activate-mint.log
  sleep $DELAY_SEC
fi
echo "=== ACTIVATING AT $(date) ===" >> /home/z/my-project/logs/activate-mint.log
cd /home/z/my-project && node scripts/activate-mint.js >> /home/z/my-project/logs/activate-mint.log 2>&1
