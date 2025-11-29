// ============================================
// Dashboard - Read-only Cognizer Monitor
// ============================================

import { PerceptToast } from '../shared/percept-toast.js';
import { MomentCard } from '../shared/components/moment-card/moment-card.js';
import { HistoryGrid } from '../shared/components/history-grid/history-grid.js';
import { Sigil } from '../shared/sigil.standalone.js';

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
let currentMomentCard = null;
let currentSigilCode = null;
let historyGrid = null;

// ============================================
// DOM Elements
// ============================================

const $connection = document.getElementById('connection');
const $sessions = document.getElementById('sessions');
const $sessionList = document.getElementById('session-list');
const $state = document.getElementById('state');
const $countdown = document.getElementById('countdown');
const $cycle = document.getElementById('cycle');
const $momentCardContainer = document.getElementById('moment-card-container');
const $perceptsList = document.getElementById('percepts-list');
const $priorMomentsList = document.getElementById('prior-moments-list');
const $lighting = document.getElementById('lighting');
const $timestamp = document.getElementById('timestamp');
const $personalityName = document.getElementById('personality-name');
const $sigilPromptName = document.getElementById('sigil-prompt-name');
// const $svgStatus = document.getElementById('svg-status'); // Commented out - keeping SDF only
const $sdfStatus = document.getElementById('sdf-status');
// const $svgPreview = document.getElementById('svg-preview'); // Commented out - keeping SDF only
const $sdfPreview = document.getElementById('sdf-preview');
const $percepts = document.getElementById('percepts');
const $historyGrid = document.getElementById('history-grid');

// ============================================
// History Grid
// ============================================

/**
 * Handle history moment click - populate center pane
 */
function onHistoryMomentClick(moment) {
  console.log('📜 History moment clicked:', moment.cycle);
  
  // Update cycle
  $cycle.textContent = moment.cycle ? `#${moment.cycle}` : '—';
  
  // Create moment card
  updateMomentCard({
    mindMoment: moment.mind_moment,
    sigilPhrase: moment.sigil_phrase,
    sigilCode: moment.sigil_code
  });
  
  // Parse percepts (JSONB comes back as objects, not strings)
  const visualPercepts = Array.isArray(moment.visual_percepts) 
    ? moment.visual_percepts 
    : [];
  const audioPercepts = Array.isArray(moment.audio_percepts) 
    ? moment.audio_percepts 
    : [];
  
  console.log('Visual percepts:', visualPercepts.length);
  console.log('Audio percepts:', audioPercepts.length);
  
  // Display percepts
  displayPercepts(visualPercepts, audioPercepts);
  
  // Fetch and display prior moments if they exist
  if (moment.prior_moment_ids && moment.prior_moment_ids.length > 0) {
    fetchAndDisplayPriorMoments(moment.prior_moment_ids);
  } else {
    $priorMomentsList.innerHTML = '<div class="empty-prior">No prior moments</div>';
  }
  
  // Lighting
  if (moment.lighting) {
    const lighting = typeof moment.lighting === 'object' ? moment.lighting : JSON.parse(moment.lighting);
    updateLightingDisplay(lighting);
  }
  
  // Timestamp
  if (moment.created_at) {
    const time = new Date(moment.created_at);
    $timestamp.textContent = time.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      hour12: true 
    });
  }
  
  // Personality
  $personalityName.textContent = moment.personality_name || '—';
  
  // Sigil Prompt
  $sigilPromptName.textContent = moment.sigil_prompt_name || '—';
  
  // Update sigil formats (SVG/SDF)
  updateSigilFormats(moment.id);
}

/**
 * Fetch and display prior moments by IDs
 */
async function fetchAndDisplayPriorMoments(priorMomentIds) {
  $priorMomentsList.innerHTML = '<div class="empty-prior">Loading...</div>';
  
  try {
    // Fetch each prior moment by ID
    const promises = priorMomentIds.map(id => 
      fetch(`/api/mind-moments/${id}`).then(r => r.json())
    );
    
    const results = await Promise.all(promises);
    const priorMoments = results.map(r => r.moment).filter(Boolean);
    
    if (priorMoments.length === 0) {
      $priorMomentsList.innerHTML = '<div class="empty-prior">No prior moments found</div>';
      return;
    }
    
    // Display as moment cards
    const momentData = priorMoments.map(m => ({
      mindMoment: m.mind_moment,
      sigilPhrase: m.sigil_phrase,
      sigilCode: m.sigil_code
    }));
    
    displayPriorMoments(momentData);
  } catch (error) {
    console.error('Failed to fetch prior moments:', error);
    $priorMomentsList.innerHTML = '<div class="empty-prior">Failed to load</div>';
  }
}

// Initialize history grid
historyGrid = new HistoryGrid($historyGrid, onHistoryMomentClick);

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
  
  // Show history when no active session
  document.body.classList.remove('active-session');
  document.body.classList.add('no-session');
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
  
  // Hide history when active session
  document.body.classList.add('active-session');
  document.body.classList.remove('no-session');
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
    
    // Load history grid
    historyGrid.loadHistory(100);
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
  
  // Mind moment received - update all fields and create moment card
  socket.on('mindMoment', (data) => {
    console.log('🧠 Mind moment:', data.mindMoment?.substring(0, 50) + '...');
    
    // Update cycle
    $cycle.textContent = data.cycle ? `#${data.cycle}` : '—';
    
    // Create/update moment card (will get sigil later)
    updateMomentCard({
      mindMoment: data.mindMoment,
      sigilPhrase: data.sigilPhrase,
      sigilCode: null // Wait for sigil event
    });
    
    // Display percepts
    displayPercepts(data.visualPercepts, data.audioPercepts);
    
    // Display prior mind moments
    displayPriorMoments(data.priorMoments);
    
    // Lighting
    updateLightingDisplay(data.lighting);
    
    // Timestamp
    if (data.timestamp) {
      const time = new Date(data.timestamp);
      $timestamp.textContent = time.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit',
        hour12: true 
      });
    } else {
      $timestamp.textContent = '—';
    }
    
    // Metadata - not available on live events, only from DB
    $personalityName.textContent = '—';
    $sigilPromptName.textContent = '—';
    
    // Clear sigil formats (will be populated after sigil generation)
    // $svgStatus.textContent = 'Generating...'; // Commented out - keeping SDF only
    $sdfStatus.textContent = 'Generating...';
    // $svgPreview.innerHTML = ''; // Commented out - keeping SDF only
    // $svgPreview.classList.remove('has-svg'); // Commented out - keeping SDF only
    if ($sdfPreview) {
      $sdfPreview.innerHTML = '';
      $sdfPreview.classList.remove('has-sdf');
    }
  });
  
  // Sigil received - update moment card with sigil
  socket.on('sigil', async (data) => {
    console.log('🎨 Sigil received');
    if (data.sigilCode) {
      currentSigilCode = data.sigilCode;
      // Update moment card with sigil if it exists
      if (currentMomentCard) {
        updateMomentCard({
          mindMoment: currentMomentCard.data.mindMoment,
          sigilPhrase: currentMomentCard.data.sigilPhrase,
          sigilCode: data.sigilCode
        });
      }
      
      // Fetch the full moment from DB to get ID and formats
      // Give database a moment to save, then fetch
      setTimeout(async () => {
        try {
          const response = await fetch('/api/mind-moments/recent?limit=1');
          const result = await response.json();
          if (result.moments && result.moments.length > 0) {
            const latestMoment = result.moments[0];
            updateSigilFormats(latestMoment.id);
          }
        } catch (error) {
          console.error('Failed to fetch moment for sigil formats:', error);
        }
      }, 500); // Wait 500ms for DB save
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
// Mind Moment Display Helpers
// ============================================

/**
 * Update or create moment card
 */
function updateMomentCard(data) {
  // If card doesn't exist, create it once
  if (!currentMomentCard) {
    currentMomentCard = new MomentCard(data);
    const cardElement = currentMomentCard.create();
    $momentCardContainer.innerHTML = '';
    $momentCardContainer.appendChild(cardElement);
  } else {
    // Card exists - just update it (triggers sigil animation)
    currentMomentCard.update(data);
  }
}

/**
 * Display percepts from mind moment (in chronological order)
 */
function displayPercepts(visualPercepts, audioPercepts) {
  $perceptsList.innerHTML = '';
  
  const hasPercepts = (visualPercepts && visualPercepts.length > 0) || 
                      (audioPercepts && audioPercepts.length > 0);
  
  if (!hasPercepts) {
    $perceptsList.innerHTML = '<div class="empty-percepts">No percepts</div>';
    return;
  }
  
  // Combine and sort by timestamp (oldest first - chronological order)
  const allPercepts = [];
  
  if (visualPercepts && visualPercepts.length > 0) {
    visualPercepts.forEach(percept => {
      allPercepts.push({ percept, type: 'visual' });
    });
  }
  
  if (audioPercepts && audioPercepts.length > 0) {
    audioPercepts.forEach(percept => {
      allPercepts.push({ percept, type: 'audio' });
    });
  }
  
  // Sort by timestamp (oldest first)
  allPercepts.sort((a, b) => {
    const timeA = new Date(a.percept.timestamp || 0).getTime();
    const timeB = new Date(b.percept.timestamp || 0).getTime();
    return timeA - timeB;
  });
  
  // Display in chronological order
  allPercepts.forEach(({ percept, type }) => {
    const toast = new PerceptToast(percept, type);
    $perceptsList.appendChild(toast.create());
  });
}

/**
 * Display prior mind moments as cards
 */
function displayPriorMoments(priorMoments) {
  $priorMomentsList.innerHTML = '';
  
  if (!priorMoments || priorMoments.length === 0) {
    $priorMomentsList.innerHTML = '<div class="empty-prior">No prior moments</div>';
    return;
  }
  
  // Display each prior moment as a mini moment card
  priorMoments.forEach(moment => {
    const card = new MomentCard({
      mindMoment: moment.mindMoment,
      sigilPhrase: moment.sigilPhrase || '—',
      sigilCode: moment.sigilCode || null
    });
    $priorMomentsList.appendChild(card.create());
  });
}

/**
 * Update lighting display with color swatch and pattern info
 */
function updateLightingDisplay(lighting) {
  if (!lighting) {
    $lighting.innerHTML = '<span class="lighting-text">—</span>';
    return;
  }
  
  const color = lighting.color || '0xffffff';
  const pattern = lighting.pattern || 'IDLE';
  const speed = lighting.speed !== undefined ? lighting.speed : 0;
  
  // Convert hex color (0xffffff) to CSS hex (#ffffff)
  const cssColor = color.replace('0x', '#');
  
  $lighting.innerHTML = `
    <span class="color-swatch" style="background-color: ${cssColor};"></span>
    <span class="lighting-text">${pattern} <span class="lighting-speed">(${speed.toFixed(1)})</span></span>
  `;
}

/**
 * Update sigil formats display (SDF status and preview)
 * @param {string} momentId - UUID of the mind moment
 */
async function updateSigilFormats(momentId) {
  if (!momentId) {
    // $svgStatus.textContent = '—'; // Commented out - keeping SDF only
    $sdfStatus.textContent = '—';
    // $svgPreview.innerHTML = ''; // Commented out - keeping SDF only
    // $svgPreview.classList.remove('has-svg'); // Commented out - keeping SDF only
    if ($sdfPreview) {
      $sdfPreview.innerHTML = '';
      $sdfPreview.classList.remove('has-sdf');
    }
    return;
  }
  
  try {
    // Fetch sigil formats info
    const response = await fetch(`/api/sigils/${momentId}/all`);
    const data = await response.json();
    
    // SVG status and preview (commented out - keeping SDF only)
    /*
    if (data.sigilSVG) {
      $svgStatus.innerHTML = `<a href="/api/sigils/${momentId}/svg" download="sigil-${data.cycle}.svg" target="_blank">Download</a>`;
      
      // Show SVG preview inline
      $svgPreview.innerHTML = data.sigilSVG;
      $svgPreview.classList.add('has-svg');
    } else {
      $svgStatus.textContent = 'Not available';
      $svgPreview.innerHTML = '';
      $svgPreview.classList.remove('has-svg');
    }
    */
    
    // Update SDF status and preview
    if (data.sdf && data.sdf.available) {
      $sdfStatus.innerHTML = `${data.sdf.width}×${data.sdf.height} · <a href="/api/sigils/${momentId}/sdf/raw" download="sigil-${data.cycle}.png" target="_blank">Download PNG</a>`;
      
      // Show SDF preview as image
      if ($sdfPreview) {
        $sdfPreview.innerHTML = `<img src="/api/sigils/${momentId}/sdf/raw" alt="SDF Preview" />`;
        $sdfPreview.classList.add('has-sdf');
      }
    } else {
      $sdfStatus.textContent = 'Not generated';
      if ($sdfPreview) {
        $sdfPreview.innerHTML = '';
        $sdfPreview.classList.remove('has-sdf');
      }
    }
  } catch (error) {
    console.error('Failed to fetch sigil formats:', error);
    // $svgStatus.textContent = 'Error loading'; // Commented out - keeping SDF only
    $sdfStatus.textContent = 'Error loading';
    // $svgPreview.innerHTML = ''; // Commented out - keeping SDF only
    // $svgPreview.classList.remove('has-svg'); // Commented out - keeping SDF only
    if ($sdfPreview) {
      $sdfPreview.innerHTML = '';
      $sdfPreview.classList.remove('has-sdf');
    }
  }
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

// Set initial state - no session, show history
document.body.classList.add('no-session');

connect();

