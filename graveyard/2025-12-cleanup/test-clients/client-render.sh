#!/bin/bash

# Client Render - Opens test client connecting to Render production server
# No local server needed, just opens the client pointing to Render

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PORT=8081

echo -e "${YELLOW}🌐 Starting UNI Test Client (Render)${NC}"
echo ""

# Function to cleanup on exit
cleanup() {
    echo ""
    echo -e "${YELLOW}🧹 Cleaning up...${NC}"
    if [ ! -z "$SERVER_PID" ]; then
        echo -e "${YELLOW}   Stopping http-server (PID: $SERVER_PID)${NC}"
        kill $SERVER_PID 2>/dev/null
    fi
    echo -e "${GREEN}✓ Clean exit${NC}"
    exit 0
}

# Set up trap to catch Ctrl+C and other exit signals
trap cleanup SIGINT SIGTERM EXIT

# Kill anything already on the port
echo -e "${YELLOW}🔍 Checking for existing process on port $PORT...${NC}"
EXISTING_PID=$(lsof -ti:$PORT)
if [ ! -z "$EXISTING_PID" ]; then
    echo -e "${YELLOW}   Found process $EXISTING_PID, killing it...${NC}"
    kill -9 $EXISTING_PID 2>/dev/null
    sleep 1
    echo -e "${GREEN}✓ Port $PORT freed${NC}"
else
    echo -e "${GREEN}✓ Port $PORT is available${NC}"
fi
echo ""

# Start the http-server in background
echo -e "${YELLOW}🚀 Starting http-server on port $PORT...${NC}"
npx http-server test-client -p $PORT -c-1 --silent > /dev/null 2>&1 &
SERVER_PID=$!

# Wait for server to be ready
echo -e "${YELLOW}   Waiting for server to start...${NC}"
sleep 2

# Check if server is running
if kill -0 $SERVER_PID 2>/dev/null; then
    echo -e "${GREEN}✓ Server started (PID: $SERVER_PID)${NC}"
else
    echo -e "${RED}✗ Failed to start server${NC}"
    exit 1
fi
echo ""

# Open in browser (no server parameter = defaults to Render)
CLIENT_URL="http://localhost:$PORT"
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
echo -e "${GREEN}  UNI Test Client Running (Render)${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "  ${YELLOW}Client URL:${NC}  $CLIENT_URL"
echo -e "  ${YELLOW}Server:${NC}      https://uni-cognizer-1.onrender.com (Render)"
echo -e "  ${YELLOW}PID:${NC}         $SERVER_PID"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop${NC}"
echo ""

# Wait indefinitely (trap will handle cleanup)
wait $SERVER_PID

