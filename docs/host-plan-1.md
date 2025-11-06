# Host Plan 1: Local Test Client

## Purpose

Create a simple HTML test client that acts as a local standin/mock for what the aggregator will be doing. This demonstrates the WebSocket integration pattern and provides a complete local test harness.

## File Structure

```
/host
  └── index.html    (standalone test client)
```

## Features

### 1. Connection Status
- Real-time connected/disconnected indicator
- Visual feedback with color coding

### 2. Session Controls
- Start Session button
- End Session button
- Auto-generate unique session IDs

### 3. Percept Simulators
- Visual percept button (sends random mock cam percept)
- Audio percept button (sends random mock mic percept)
- Disabled when session not active

### 4. Mind Moment Display
- Real-time display of latest mind moment
- Shows cycle number, mind moment text, sigil phrase, timestamp
- Card-based layout for readability

### 5. History View
- Shows last 5 mind moments
- Scrollable list of cycle + sigil phrase

### 6. Session Stats
- Duration (live updating)
- Percepts sent count
- Mind moments received count

## UI Layout

```
┌─────────────────────────────────────────┐
│ COGNIZER-1 Test Host                    │
│ Status: ● Connected                     │
├─────────────────────────────────────────┤
│ [Start Session]  [End Session]         │
├─────────────────────────────────────────┤
│ Send Percepts:                          │
│ [👁️ Visual]  [🎤 Audio]                │
├─────────────────────────────────────────┤
│ Latest Mind Moment:                     │
│ ┌───────────────────────────────────┐  │
│ │ Cycle #5                          │  │
│ │ 🧠 "Welcome, curious visitor..."  │  │
│ │ 🔮 "Threshold of Wonder"          │  │
│ │ 🕐 2:34 PM                        │  │
│ └───────────────────────────────────┘  │
├─────────────────────────────────────────┤
│ Session Stats:                          │
│ • Duration: 2m 34s                      │
│ • Percepts sent: 12                     │
│ • Mind moments: 5                       │
├─────────────────────────────────────────┤
│ History (last 5):                       │
│ • Cycle 5: Threshold of Wonder          │
│ • Cycle 4: Embracing Tomorrow           │
│ • Cycle 3: Building Hope                │
└─────────────────────────────────────────┘
```

## Technical Details

### Dependencies
- Socket.io client (CDN): `https://cdn.socket.io/4.8.1/socket.io.min.js`
- No build process required
- Single HTML file with inline CSS and JS

### Configuration
```javascript
const SOCKET_URL = 'http://localhost:3001';
const SESSION_ID = 'test-session-' + Date.now();
```

### Mock Data

**Visual Percepts:**
```javascript
{ action: "Visitor approaching", emoji: "🚶" }
{ action: "Looking up at ceiling", emoji: "⬆️" }
{ action: "Taking photo", emoji: "📱" }
{ action: "Reading plaque", emoji: "👀" }
```

**Audio Percepts:**
```javascript
{
  transcript: "Wow, this is amazing!",
  analysis: "Visitor expressing wonder and excitement",
  tone: "Enthusiastic",
  emoji: "😮",
  sentiment: "positive",
  confidence: 0.9
}
```

## WebSocket Events

### Emitted by Client
- `startSession` - Initiates a new session
- `endSession` - Terminates current session
- `percept` - Sends a visual or audio percept

### Received by Client
- `connect` - Socket connected
- `disconnect` - Socket disconnected
- `sessionStarted` - Session successfully started
- `sessionEnded` - Session successfully ended
- `mindMoment` - New mind moment from UNI
- `error` - Error message

## Message Formats

### Start Session
```javascript
socket.emit('startSession', { 
  sessionId: 'test-session-123456' 
});
```

### Send Percept
```javascript
socket.emit('percept', {
  sessionId: 'test-session-123456',
  type: 'visual', // or 'audio'
  data: {
    action: "Looking up",
    emoji: "⬆️"
  },
  timestamp: '2025-11-06T10:30:00.000Z'
});
```

### Receive Mind Moment
```javascript
socket.on('mindMoment', (data) => {
  // data = {
  //   cycle: 5,
  //   mindMoment: "Welcome, curious visitor...",
  //   sigilPhrase: "Threshold of Wonder",
  //   timestamp: "2025-11-06T10:30:05.000Z",
  //   sessionId: "test-session-123456"
  // }
});
```

## State Management

### Client State
```javascript
let sessionActive = false;
let sessionStartTime = null;
let perceptCount = 0;
let momentCount = 0;
let durationInterval = null;
let history = [];
```

### UI Updates
- Status indicator updates on connect/disconnect
- Buttons enable/disable based on session state
- Stats update on each percept/moment
- Duration timer runs during active session

## Key Integration Patterns Demonstrated

✅ WebSocket connection lifecycle  
✅ Session management (start/stop)  
✅ Sending percepts with proper format  
✅ Receiving and displaying mind moments  
✅ Error handling  
✅ Connection status monitoring  
✅ Real-time updates  
✅ Session statistics tracking  

## Usage Flow

1. **Start Server**: `npm start` in cognizer-1 directory
2. **Open Client**: Open `host/index.html` in browser
3. **Connect**: Page auto-connects to `ws://localhost:3001`
4. **Start Session**: Click "Start Session" button
5. **Send Percepts**: Click visual/audio buttons to send mock data
6. **Observe**: Watch UNI's mind moments appear in real-time
7. **End Session**: Click "End Session" when done

## Benefits

- **Zero Setup**: Just open in browser
- **No Build**: Single HTML file, no compilation
- **Visual Feedback**: See exactly what's happening
- **Cost-Free Testing**: Use mock data, no LLM calls
- **Integration Template**: Shows exact patterns for real aggregator

## Next Steps

After validating with this test host:

1. Build real aggregator with same patterns
2. Replace mock percepts with real cam/mic data
3. Add more sophisticated UI
4. Deploy both cognizer and aggregator
5. Connect them in production

## File Location

`/Users/jamespaterson/Dropbox/WONDERKIN/prototyping/cognizer-1/host/index.html`

