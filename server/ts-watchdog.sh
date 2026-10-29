#!/bin/bash
# Restart tailscaled only on NEW signs that its control link dropped or Funnel traffic is refused.
LOG=/tmp/tailscaled.log
POS=$(wc -l < $LOG)
while true; do
  sleep 20
  END=$(wc -l < $LOG)
  N=$(sed -n "$((POS+1)),${END}p" $LOG | grep -cE "PollNetMap: unexpected EOF|time jump detected")
  POS=$END
  if [ "$N" -gt 0 ]; then
    echo "$(date) watchdog restart ($N)" >> /tmp/ts-watchdog.log
    sudo pkill tailscaled; sleep 2
    sudo setsid nohup tailscaled --tun=userspace-networking --state=/var/lib/tailscale/tailscaled.state --socket=/var/run/tailscale/tailscaled.sock >> $LOG 2>&1 < /dev/null &
    sleep 40
    POS=$(wc -l < $LOG)
  fi
done
