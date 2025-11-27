// ============================================
// Dashboard - Read-only Cognizer Monitor
// ============================================

import { PerceptToast, injectPerceptToastStyles } from '../shared/percept-toast.js';
import { Sigil } from '../shared/sigil.standalone.js';

// Inject toast styles
injectPerceptToastStyles();

// ============================================
// Configuration
// ============================================

const CONFIG = {
  MAX_PERCEPTS: 50,                 // Maximum percepts to display
  COUNTDOWN_INTERVAL_MS: 100,       // Update countdown every 100ms
  SOCKET_RECONNECT_DELAY: 1000,     // Initial reconnect delay
  SOCKET_RECONNECT_MAX: 5000,       // Max reconnect delay
  DEFAULT_CYCLE_MS: 5000            // Default cognitive cycle duration
};

// ============================================
// State
// ============================================

let socket = null;
let cycleMs = CONFIG.DEFAULT_CYCLE_MS;
let nextCycleTime = null;
let countdownInterval = null;
let sigil = null;

// ============================================
// DOM Elements
// ============================================

const $connection = document.getElementById('connection');
const $sessions = document.getElementById('sessions');
const $sessionList = document.getElementById('session-list');
const $state = document.getElementById('state');
const $countdown = document.getElementById('countdown');
const $mindMoment = document.getElementById('mind-moment');
const $sigilPhrase = document.getElementById('sigil-phrase');
const $percepts = document.getElementById('percepts');
const $sigilCanvas = document.getElementById('sigil-canvas');

// ============================================
// Sigil Renderer
// ============================================

sigil = new Sigil({
  canvas: $sigilCanvas,
  canvasSize: 120,
  scale: 1.0,
  lineColor: '#ffffff',
  lineWeight: 2.0,
  drawDuration: 0
});

// ============================================
// Socket.io Connection (READ-ONLY - no session)
// ============================================

/**
 * Update cognitive state display with proper styling
 */
function updateStateDisplay(state) {
  $state.textContent = state;
  $state.className = `value state ${state.toLowerCase()}`;
}

/**
 * Clear countdown timer and display
 */
function clearCountdown() {
  nextCycleTime = null;
  $countdown.textContent = '—';
  if (countdownInterval) {
    clearInterval(countdownInterval);
    countdownInterval = null;
  }
}

/**
 * Handle the case when no sessions are active
 */
function handleNoActiveSessions() {
  $sessionList.innerHTML = '<div class="session-item">No active sessions</div>';
  clearCountdown();
}

/**
 * Handle the case when sessions are active
 */
function handleActiveSessions(sessions) {
  $sessionList.innerHTML = sessions
    .map(s => `<div class="session-item">• ${s.id}</div>`)
    .join('');
  // Request fresh cycle status to sync countdown
  socket.emit('getCycleStatus');
}

function connect() {
  const url = window.location.origin;
  
  console.log('🔌 Connecting to Cognizer (read-only)...', url);
  
  socket = io(url, {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: CONFIG.SOCKET_RECONNECT_DELAY,
    reconnectionDelayMax: CONFIG.SOCKET_RECONNECT_MAX
  });
  
  socket.on('connect', () => {
    console.log('✅ Connected to Cognizer (read-only, no session)');
    $connection.textContent = 'Connected';
    $connection.className = 'value connection connected';
    
    // Dashboard is 100% read-only - never starts a session
    // Request current cycle and session status to sync UI immediately
    socket.emit('getCycleStatus');
    socket.emit('getSessionStatus');
  });
  
  // Cycle status response - initial sync of countdown and state
  socket.on('cycleStatus', ({ isRunning, intervalMs, nextCycleAt, state }) => {
    console.log('📊 Cycle status:', { isRunning, intervalMs, state });
    cycleMs = intervalMs;
    
    // Update state display
    updateStateDisplay(state);
    
    if (isRunning && nextCycleAt) {
      nextCycleTime = nextCycleAt;
      startCountdown();
    } else {
      clearCountdown();
    }
  });
  
  socket.on('disconnect', () => {
    console.log('⚫ Disconnected from Cognizer');
    $connection.textContent = 'Disconnected';
    $connection.className = 'value connection disconnected';
  });
  
  // Cognitive state updates (from cognitive engine events)
  socket.on('cognitiveState', ({ state }) => {
    console.log('🧠 State:', state);
    updateStateDisplay(state);
  });
  
  // Session tracking - shows which clients are actively observing
  socket.on('sessionsUpdate', ({ count, sessions }) => {
    console.log('📊 Sessions:', { count, sessions });
    $sessions.textContent = count;
    
    if (count === 0) {
      handleNoActiveSessions();
    } else {
      handleActiveSessions(sessions);
    }
  });
  
  // Cycle started - reset countdown and clear old percepts
  socket.on('cycleStarted', ({ cycle, cognitiveCycleMs }) => {
    console.log('🔄 Cycle started:', cycle);
    
    // Update cycle time if provided
    if (cognitiveCycleMs) {
      cycleMs = parseInt(cognitiveCycleMs, 10) || CONFIG.DEFAULT_CYCLE_MS;
    }
    
    nextCycleTime = Date.now() + cycleMs;
    clearPercepts();
    startCountdown();
  });
  
  socket.on('perceptReceived', (data) => {
    console.log('👁️ Percept:', data.type);
    addPercept(data);
  });
  
  // Mind moment received - update text and clear old sigil
  socket.on('mindMoment', (data) => {
    console.log('🧠 Mind moment:', data.mindMoment?.substring(0, 50) + '...');
    $mindMoment.textContent = data.mindMoment || '—';
    $sigilPhrase.textContent = data.sigilPhrase || '—';
    
    // Clear old sigil instantly (new one will arrive via 'sigil' event)
    sigil.clear(true);
  });
  
  // Sigil received - render on canvas
  socket.on('sigil', (data) => {
    console.log('🎨 Sigil received');
    if (data.sigilCode) {
      sigil.drawSigil({ calls: data.sigilCode });
    }
  });
}

// ============================================
// Countdown Timer
// ============================================

/**
 * Start countdown timer - updates every 100ms
 */
function startCountdown() {
  if (countdownInterval) clearInterval(countdownInterval);
  
  countdownInterval = setInterval(() => {
    if (!nextCycleTime) {
      $countdown.textContent = '—';
      return;
    }
    
    const remaining = Math.max(0, (nextCycleTime - Date.now()) / 1000);
    
    if (remaining > 0) {
      $countdown.textContent = Math.ceil(remaining) + 's';
    } else {
      $countdown.textContent = '...';
    }
  }, CONFIG.COUNTDOWN_INTERVAL_MS);
}

// ============================================
// Percept Display
// ============================================

/**
 * Clear all percepts and show empty state
 */
function clearPercepts() {
  $percepts.innerHTML = '<div class="empty">Waiting for percepts...</div>';
}

/**
 * Add a percept toast to the display
 * @param {Object} data - Percept data with type and payload
 */
function addPercept(data) {
  // Remove empty message if present
  const empty = $percepts.querySelector('.empty');
  if (empty) empty.remove();
  
  // Build percept object for toast (normalize field names)
  const percept = {
    ...data.data,
    sigilPhrase: data.data?.sigilPhrase,
    sigilDrawCalls: data.data?.sigilDrawCalls || data.data?.drawCalls
  };
  
  // Create and add toast
  const toast = new PerceptToast(percept, data.type);
  const element = toast.create();
  $percepts.prepend(element); // Newest at top
  
  // Limit display to prevent memory issues
  while ($percepts.children.length > CONFIG.MAX_PERCEPTS) {
    $percepts.lastElementChild.remove();
  }
}

// ============================================
// Initialize
// ============================================

console.log('🚀 Dashboard initializing...');
connect();

