#!/bin/bash

# Client Fake - Starts fake server + opens test client connecting to localhost
# Uses mock LLM calls (no API costs)

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

BACKEND_PORT=3001
CLIENT_PORT=8081

echo -e "${YELLOW}🎭 Starting UNI Test Client (Local - Fake Server)${NC}"
echo ""

# Function to cleanup on exit
cleanup() {
    echo ""
    echo -e "${YELLOW}🧹 Cleaning up...${NC}"
    if [ ! -z "$BACKEND_PID" ]; then
        echo -e "${YELLOW}   Stopping fake backend server (PID: $BACKEND_PID)${NC}"
        kill $BACKEND_PID 2>/dev/null
    fi
    if [ ! -z "$CLIENT_PID" ]; then
        echo -e "${YELLOW}   Stopping http-server (PID: $CLIENT_PID)${NC}"
        kill $CLIENT_PID 2>/dev/null
    fi
    echo -e "${GREEN}✓ Clean exit${NC}"
    exit 0
}

# Set up trap to catch Ctrl+C and other exit signals
trap cleanup SIGINT SIGTERM EXIT

# Kill anything already on the ports
echo -e "${YELLOW}🔍 Checking for existing processes...${NC}"

# Backend port
BACKEND_EXISTING=$(lsof -ti:$BACKEND_PORT)
if [ ! -z "$BACKEND_EXISTING" ]; then
    echo -e "${YELLOW}   Found process $BACKEND_EXISTING on port $BACKEND_PORT, killing it...${NC}"
    kill -9 $BACKEND_EXISTING 2>/dev/null
    sleep 1
    echo -e "${GREEN}✓ Port $BACKEND_PORT freed${NC}"
else
    echo -e "${GREEN}✓ Port $BACKEND_PORT is available${NC}"
fi

# Client port
CLIENT_EXISTING=$(lsof -ti:$CLIENT_PORT)
if [ ! -z "$CLIENT_EXISTING" ]; then
    echo -e "${YELLOW}   Found process $CLIENT_EXISTING on port $CLIENT_PORT, killing it...${NC}"
    kill -9 $CLIENT_EXISTING 2>/dev/null
    sleep 1
    echo -e "${GREEN}✓ Port $CLIENT_PORT freed${NC}"
else
    echo -e "${GREEN}✓ Port $CLIENT_PORT is available${NC}"
fi
echo ""

# Start fake backend server in background (with logs visible)
echo -e "${YELLOW}🚀 Starting fake backend server (port $BACKEND_PORT)...${NC}"
echo -e "${YELLOW}   Server logs will appear below:${NC}"
echo ""
node src/fake/server.js &
BACKEND_PID=$!

# Wait for backend to be ready
echo -e "${YELLOW}   Waiting for fake backend to start...${NC}"
sleep 3

# Check if backend is running
if kill -0 $BACKEND_PID 2>/dev/null; then
    echo -e "${GREEN}✓ Fake backend started (PID: $BACKEND_PID)${NC}"
else
    echo -e "${RED}✗ Failed to start fake backend server${NC}"
    exit 1
fi
echo ""

# Start the http-server in background
echo -e "${YELLOW}🚀 Starting http-server on port $CLIENT_PORT...${NC}"
npx http-server test-client -p $CLIENT_PORT -c-1 --silent > /dev/null 2>&1 &
CLIENT_PID=$!

# Wait for client server to be ready
echo -e "${YELLOW}   Waiting for client server to start...${NC}"
sleep 2

# Check if client server is running
if kill -0 $CLIENT_PID 2>/dev/null; then
    echo -e "${GREEN}✓ Client server started (PID: $CLIENT_PID)${NC}"
else
    echo -e "${RED}✗ Failed to start client server${NC}"
    kill $BACKEND_PID 2>/dev/null
    exit 1
fi
echo ""

# Open in browser with server parameter pointing to localhost
CLIENT_URL="http://localhost:$CLIENT_PORT?server=http://localhost:$BACKEND_PORT"
echo -e "${YELLOW}🌐 Opening $CLIENT_URL in browser...${NC}"
if command -v open &> /dev/null; then
    open "$CLIENT_URL"
elif command -v xdg-open &> /dev/null; then
    xdg-open "$CLIENT_URL"
else
    echo -e "${YELLOW}   Could not detect browser opener, please open manually${NC}"
fi
echo -e "${GREEN}✓ Browser opened${NC}"
echo ""

echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  UNI Test Client Running (Local - Fake Server)${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "  ${YELLOW}Client URL:${NC}  $CLIENT_URL"
echo -e "  ${YELLOW}Backend:${NC}     http://localhost:$BACKEND_PORT (Mock LLM)"
echo -e "  ${YELLOW}Backend PID:${NC} $BACKEND_PID"
echo -e "  ${YELLOW}Client PID:${NC}  $CLIENT_PID"
echo ""
echo -e "${GREEN}✓ Using mock LLM calls (no API costs)${NC}"
echo ""
echo -e "${YELLOW}Server logs appear above. Press Ctrl+C to stop${NC}"
echo ""

# Wait for backend process (logs will stream, http-server runs silently in background)
wait $BACKEND_PID

