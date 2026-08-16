#!/bin/bash
cd "$(dirname "$0")/.."

CONFIG="qdrant-config.yaml"
EXAMPLE="qdrant-config.yaml.example"
PID_FILE="/tmp/qdrant.pid"

if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
    echo "Qdrant is already running (PID: $(cat "$PID_FILE"))"
    exit 0
fi

if [ ! -f "$CONFIG" ]; then
    if [ -f "$EXAMPLE" ]; then
        cp "$EXAMPLE" "$CONFIG"
        echo "Created $CONFIG from $EXAMPLE"
    else
        echo "Error: $CONFIG not found"
        exit 1
    fi
fi

nohup qdrant --config-path "$(pwd)/$CONFIG" > /tmp/qdrant.log 2>&1 &
echo $! > "$PID_FILE"

sleep 2
if curl -s http://localhost:6333/healthz >/dev/null 2>&1; then
    echo "Qdrant started (PID: $(cat "$PID_FILE")), port 6333"
else
    echo "Qdrant failed to start, check /tmp/qdrant.log"
    exit 1
fi
