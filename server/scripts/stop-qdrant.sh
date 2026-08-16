#!/bin/bash
PID_FILE="/tmp/qdrant.pid"

if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    if kill -0 "$PID" 2>/dev/null; then
        kill "$PID"
        echo "Qdrant stopped (PID: $PID)"
    else
        echo "Qdrant process $PID not found"
    fi
    rm -f "$PID_FILE"
else
    # fallback: kill by name
    pkill -f "qdrant.*config-path" 2>/dev/null && echo "Qdrant stopped" || echo "Qdrant is not running"
fi
