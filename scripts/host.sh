#!/bin/bash

# Host Test Client Startup Script
# Kills any process on port 8080, then starts http-server and opens browser

# Cleanup function to kill http-server on exit
cleanup() {
  echo ""
  echo "🛑 Shutting down host server..."
  if [ -n "$SERVER_PID" ]; then
    echo "🔪 Stopping http-server (PID: $SERVER_PID)"
    kill $SERVER_PID 2>/dev/null
  fi
  echo "✅ Host server stopped"
  exit 0
}

# Trap Ctrl+C and other exit signals
trap cleanup SIGINT SIGTERM EXIT

echo "🔍 Checking for process on port 8080..."

# Kill process on port 8080
EXISTING_PID=$(lsof -ti:8080)
if [ -n "$EXISTING_PID" ]; then
  echo "🔪 Killing process on port 8080 (PID: $EXISTING_PID)"
  kill -9 $EXISTING_PID
  sleep 1
else
  echo "✅ Port 8080 is free"
fi

echo ""
echo "🚀 Starting host test client..."
echo ""

# Start http-server in background
npx http-server -p 8080 -c-1 --cors -o /host/ &
SERVER_PID=$!

echo "✅ Host server started (PID: $SERVER_PID)"
echo ""
echo "🌐 URL: http://localhost:8080/host/"
echo "📝 PID: $SERVER_PID"
echo ""
echo "Press Ctrl+C to stop"
echo ""

# Wait for the process
wait

