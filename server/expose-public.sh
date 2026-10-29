#!/bin/bash
# Run after the Tailscale login link has been approved. Publishes the app (port 8787) on a public HTTPS
# Tailscale Funnel URL and points Twilio callbacks at it. If Funnel is not yet enabled for the tailnet,
# tailscale prints a link to enable it; open it, then run this script again.
set -e
cd "$(dirname "$0")"
sudo tailscale funnel --bg 8787
URL=$(sudo tailscale funnel status 2>/dev/null | grep -o 'https://[^ ]*ts.net' | head -1)
[ -n "$URL" ] || { echo "Funnel URL not found yet"; exit 1; }
sed -i "s#^PUBLIC_BASE_URL=.*#PUBLIC_BASE_URL=$URL#" .env
echo "$URL" > data/public_url.txt
pkill -f "src/index.ts" || true   # run-prod.sh restarts it with the new URL
echo "Public URL: $URL"
