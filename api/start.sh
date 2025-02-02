#!/bin/bash

# Check if Python is available
if ! command -v python &> /dev/null; then
    echo "Python is not installed"
    exit 1
fi

# Check if the server is already running
if [ -f "api/stocks.pid" ]; then
    pid=$(cat api/stocks.pid)
    if ps -p $pid > /dev/null 2>&1; then
        echo "Stock price server is already running (PID: $pid)"
        exit 1
    else
        # Remove stale PID file
        rm api/stocks.pid
    fi
fi

# Start the server
echo "Starting stock price server..."
python api/price_updater.py &

# Wait for the server to start
sleep 2

# Check if the server started successfully
if [ -f "api/stocks.pid" ]; then
    echo "Stock price server started successfully"
    echo "Server PID: $(cat api/stocks.pid)"
else
    echo "Failed to start stock price server"
    exit 1
fi