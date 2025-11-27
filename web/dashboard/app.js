// ============================================
// Dashboard - Read-only Cognizer Monitor
// ============================================

import { PerceptToast, injectPerceptToastStyles } from '../shared/percept-toast.js';
import { Sigil } from '../shared/sigil.standalone.js';

// Inject toast styles
injectPerceptToastStyles();

// ============================================
// State
// ============================================

let socket = null;
let cycleMs = 5000;
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

function connect() {
  const url = window.location.origin;
  
  console.log('🔌 Connecting to Cognizer (read-only)...', url);
  
  socket = io(url, {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000
  });
  
  socket.on('connect', () => {
    console.log('✅ Connected to Cognizer (read-only, no session)');
    $connection.textContent = 'Connected';
    $connection.className = 'value connection connected';
    // NO startSession - dashboard is 100% read-only
    // Request current cycle status and session status to sync UI
    socket.emit('getCycleStatus');
    socket.emit('getSessionStatus');
  });
  
  // Cycle status response - sync our countdown and state
  socket.on('cycleStatus', ({ isRunning, intervalMs, nextCycleAt, msUntilNextCycle, state }) => {
    console.log('📊 Cycle status:', { isRunning, intervalMs, msUntilNextCycle, state });
    cycleMs = intervalMs;
    
    // Update state display
    $state.textContent = state;
    $state.className = `value state ${state.toLowerCase()}`;
    
    if (isRunning && nextCycleAt) {
      nextCycleTime = nextCycleAt;
      startCountdown();
    } else {
      nextCycleTime = null;
      $countdown.textContent = '—';
    }
  });
  
  socket.on('disconnect', () => {
    console.log('⚫ Disconnected from Cognizer');
    $connection.textContent = 'Disconnected';
    $connection.className = 'value connection disconnected';
  });
  
  socket.on('cognitiveState', ({ state }) => {
    console.log('🧠 State:', state);
    $state.textContent = state;
    $state.className = `value state ${state.toLowerCase()}`;
  });
  
  socket.on('sessionsUpdate', ({ count, sessions }) => {
    console.log('📊 Sessions:', { count, sessions });
    $sessions.textContent = count;
    
    if (count === 0) {
      // No active sessions - clear countdown
      $sessionList.innerHTML = '<div class="session-item">No active sessions</div>';
      nextCycleTime = null;
      $countdown.textContent = '—';
      if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
      }
    } else {
      // Sessions active - update list and refresh cycle status
      $sessionList.innerHTML = sessions
        .map(s => `<div class="session-item">• ${s.id}</div>`)
        .join('');
      
      // Request cycle status to sync countdown
      socket.emit('getCycleStatus');
    }
  });
  
  socket.on('cycleStarted', ({ cycle, cognitiveCycleMs }) => {
    console.log('🔄 Cycle started:', cycle);
    // Update cycle time if provided
    if (cognitiveCycleMs) {
      cycleMs = parseInt(cognitiveCycleMs, 10) || 5000;
    }
    nextCycleTime = Date.now() + cycleMs;
    clearPercepts();
    startCountdown();
  });
  
  socket.on('perceptReceived', (data) => {
    console.log('👁️ Percept:', data.type);
    addPercept(data);
  });
  
  socket.on('mindMoment', (data) => {
    console.log('🧠 Mind moment:', data.mindMoment?.substring(0, 50) + '...');
    $mindMoment.textContent = data.mindMoment || '—';
    $sigilPhrase.textContent = data.sigilPhrase || '—';
    
    // Clear old sigil (new one will arrive via 'sigil' event)
    sigil.clear(true);  // Instant clear, no animation
  });
  
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
  }, 100);
}

// ============================================
// Percept Display
// ============================================

function clearPercepts() {
  $percepts.innerHTML = '<div class="empty">Waiting for percepts...</div>';
}

function addPercept(data) {
  // Remove empty message
  const empty = $percepts.querySelector('.empty');
  if (empty) empty.remove();
  
  // Build percept object for toast
  const percept = {
    ...data.data,
    sigilPhrase: data.data?.sigilPhrase,
    sigilDrawCalls: data.data?.sigilDrawCalls || data.data?.drawCalls
  };
  
  // Create toast
  const toast = new PerceptToast(percept, data.type);
  const element = toast.create();
  
  // Prepend (newest at top)
  $percepts.prepend(element);
  
  // Limit to 50
  while ($percepts.children.length > 50) {
    $percepts.lastElementChild.remove();
  }
}

// ============================================
// Initialize
// ============================================

console.log('🚀 Dashboard initializing...');
connect();

