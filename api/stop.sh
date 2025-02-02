#!/bin/bash

# Check if the server is running
if [ -f "api/stocks.pid" ]; then
    pid=$(cat api/stocks.pid)
    if ps -p $pid > /dev/null 2>&1; then
        echo "Stopping stock price server (PID: $pid)..."
        kill $pid
        rm api/stocks.pid
        echo "Server stopped"
    else
        echo "Server is not running (stale PID file)"
        rm api/stocks.pid
    fi
else
    echo "Server is not running"
fi