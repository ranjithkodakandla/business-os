#!/bin/bash
# Keeps the production server (and its cloudflared tunnel) running; restarts on exit.
cd "$(dirname "$0")"
while true; do npx tsx src/index.ts >> /tmp/bw-prod.log 2>&1; echo "[run-prod] restart $(date)" >> /tmp/bw-prod.log; sleep 3; done
