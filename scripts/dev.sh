#!/bin/bash

# Cognizer-1 Development Startup Script
# Kills any processes on ports 3001 and 8080, then starts both servers

# Cleanup function to kill child processes on exit
cleanup() {
  echo ""
  echo "🛑 Shutting down servers..."
  if [ -n "$BACKEND_NEW_PID" ]; then
    echo "🔪 Stopping backend (PID: $BACKEND_NEW_PID)"
    kill $BACKEND_NEW_PID 2>/dev/null
  fi
  if [ -n "$FRONTEND_NEW_PID" ]; then
    echo "🔪 Stopping frontend (PID: $FRONTEND_NEW_PID)"
    kill $FRONTEND_NEW_PID 2>/dev/null
  fi
  echo "✅ Cleanup complete"
  exit 0
}

# Trap Ctrl+C and other exit signals
trap cleanup SIGINT SIGTERM EXIT

echo "🔍 Checking for processes on ports 3001 and 8080..."

# Kill process on port 3001 (backend)
BACKEND_PID=$(lsof -ti:3001)
if [ -n "$BACKEND_PID" ]; then
  echo "🔪 Killing process on port 3001 (PID: $BACKEND_PID)"
  kill -9 $BACKEND_PID
else
  echo "✅ Port 3001 is free"
fi

# Kill process on port 8080 (frontend)
FRONTEND_PID=$(lsof -ti:8080)
if [ -n "$FRONTEND_PID" ]; then
  echo "🔪 Killing process on port 8080 (PID: $FRONTEND_PID)"
  kill -9 $FRONTEND_PID
else
  echo "✅ Port 8080 is free"
fi

echo ""
echo "🚀 Starting Cognizer-1 development environment..."
echo ""

# Start backend in background
echo "▶️  Starting WebSocket server (port 3001)..."
node server.js &
BACKEND_NEW_PID=$!
echo "✅ Backend started (PID: $BACKEND_NEW_PID)"

# Give backend a moment to start
sleep 1

# Start frontend in background
echo "▶️  Starting host dev server (port 8080)..."
npx http-server -p 8080 -c-1 --cors &
FRONTEND_NEW_PID=$!
echo "✅ Frontend started (PID: $FRONTEND_NEW_PID)"

echo ""
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║  Cognizer-1 Development Environment Ready!               ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""
echo "🌐 Backend:  http://localhost:3001"
echo "🌐 Frontend: http://localhost:8080/host/"
echo ""
echo "📝 Backend PID:  $BACKEND_NEW_PID"
echo "📝 Frontend PID: $FRONTEND_NEW_PID"
echo ""
echo "Press Ctrl+C to stop both servers"
echo ""

# Wait for both processes
wait

