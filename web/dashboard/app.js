// ============================================
// Dashboard - Read-only Cognizer Monitor
// ============================================

import { PerceptToast } from '../shared/percept-toast.js';
import { PerceptExpanded } from '../shared/components/percept-expanded/percept-expanded.js';
import { MomentCard } from '../shared/components/moment-card/moment-card.js';
import { MomentCardHero } from '../shared/components/moment-card-hero/moment-card-hero.js';
import { HistoryGrid } from '../shared/components/history-grid/history-grid.js';
import { Sigil } from '../shared/sigil.standalone.js';
import { UniBrand } from '../shared/components/uni-brand/uni-brand.js';

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
let currentPerceptExpanded = null;
let currentState = 'IDLE';

// ============================================
// DOM Elements
// ============================================

const $connection = document.getElementById('connection');
const $sessions = document.getElementById('sessions');
const $state = document.getElementById('state');
const $countdown = document.getElementById('countdown');
const $cycle = document.getElementById('cycle');
const $center = document.querySelector('.center');
const $collectingState = document.getElementById('collecting-state');
const $contentState = document.getElementById('content-state');
const $momentCardContainer = document.getElementById('moment-card-container');
const $perceptsList = document.getElementById('percepts-list');
const $priorMomentsList = document.getElementById('prior-moments-list');
const $lighting = document.getElementById('lighting');
const $timestamp = document.getElementById('timestamp');
const $personalityName = document.getElementById('personality-name');
const $sigilPromptName = document.getElementById('sigil-prompt-name');
const $pngStatus = document.getElementById('png-status');
const $pngDisplay = document.getElementById('sigil-png-display');
const $perceptPngsSection = document.getElementById('percept-pngs-section');
const $perceptPngGridContainer = document.getElementById('percept-png-grid-container');
const $percepts = document.getElementById('percepts');
const $perceptExpandedContainer = document.getElementById('percept-expanded-container');
const $collectingMessage = document.querySelector('.collecting-message');
const $historyGrid = document.getElementById('history-grid');
const $uniBrand = document.getElementById('uni-brand');

// ============================================
// UniBrand Initialization
// ============================================

/**
 * Initialize UniBrand component
 */
function initUniBrand() {
  try {
    const uniBrand = new UniBrand({
      canvasSize: 80,
      lineColor: '#ffffff',
      lineWeight: 2.0
    });
    
    const element = uniBrand.create();
    $uniBrand.appendChild(element);
    
    console.log('🎨 UniBrand initialized');
  } catch (error) {
    console.error('Failed to initialize UniBrand:', error);
  }
}

// Initialize UniBrand
initUniBrand();

// ============================================
// History Grid
// ============================================

/**
 * Handle history moment click - populate center pane
 */
function onHistoryMomentClick(moment) {
  console.log('📜 History moment clicked:', moment.cycle);
  
  // Switch to content state
  showContentState();
  
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
  
  // Update sigil formats (SVG/SDF) and percept PNG grid
  updateSigilFormats(moment.id, visualPercepts, audioPercepts);
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
// History Grid Keyboard Navigation
// ============================================

let selectedHistoryIndex = -1; // Track selected moment index

/**
 * Handle keyboard navigation in history grid
 * LEFT arrow = previous (newer moment)
 * RIGHT arrow = next (older moment)
 */
function initHistoryKeyboardNav() {
  document.addEventListener('keydown', (e) => {
    // Only handle if we have moments loaded
    if (!historyGrid || !historyGrid.moments || historyGrid.moments.length === 0) {
      return;
    }
    
    // LEFT arrow = previous (newer moment)
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      navigateHistory(-1);
    }
    
    // RIGHT arrow = next (older moment)
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      navigateHistory(1);
    }
  });
}

/**
 * Navigate history by offset
 * @param {number} offset - -1 for prev (newer), +1 for next (older)
 */
function navigateHistory(offset) {
  const moments = historyGrid.moments;
  
  // Find current selection
  const currentCell = document.querySelector('.sigil-cell.selected');
  if (currentCell) {
    const momentId = currentCell.dataset.momentId;
    selectedHistoryIndex = moments.findIndex(m => m.id === momentId);
  }
  
  // If nothing selected, start at beginning
  if (selectedHistoryIndex === -1) {
    selectedHistoryIndex = 0;
  } else {
    // Move selection
    selectedHistoryIndex = Math.max(0, Math.min(moments.length - 1, selectedHistoryIndex + offset));
  }
  
  // Get and display the selected moment
  const selectedMoment = moments[selectedHistoryIndex];
  if (selectedMoment) {
    onHistoryMomentClick(selectedMoment);
    
    // Update visual selection
    const cells = document.querySelectorAll('.sigil-cell');
    cells.forEach(cell => {
      if (cell.dataset.momentId === selectedMoment.id) {
        cell.classList.add('selected');
        cell.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      } else {
        cell.classList.remove('selected');
      }
    });
  }
}

// Initialize keyboard navigation
initHistoryKeyboardNav();

// ============================================
// Socket.io Connection (READ-ONLY - no session)
// ============================================

/**
 * Update cognitive state display with proper styling
 */
function updateStateDisplay(state) {
  currentState = state;
  $state.textContent = state;
  $state.className = `value state ${state.toLowerCase()}`;
  
  // Update collecting message based on state
  if ($collectingMessage) {
    if (state === 'DREAMING') {
      $collectingMessage.textContent = 'Collecting Dream Percepts...';
    } else {
      $collectingMessage.textContent = 'Collecting Percepts...';
    }
  }
}

/**
 * Show collecting state (instant, no fade)
 */
function showCollectingState() {
  $center.classList.add('is-collecting');
  console.log('💭 Showing collecting state');
}

/**
 * Show content state (instant, no fade)
 */
function showContentState() {
  $center.classList.remove('is-collecting');
  console.log('👁️ Showing content state');
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
  $sessions.textContent = 'none';
  clearCountdown();
  
  // Show history when no active session
  document.body.classList.remove('active-session');
  document.body.classList.add('no-session');
}

/**
 * Handle the case when sessions are active
 */
function handleActiveSessions(sessions) {
  // If transitioning from dream mode (no-session), clear dream percepts
  if (document.body.classList.contains('no-session')) {
    console.log('🧹 Clearing dream percepts on transition to live mode');
    clearPercepts();
  }
  
  $sessions.textContent = sessions.map(s => s.id).join(', ');
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
    
    // Load history grid (load all moments)
    historyGrid.loadHistory();
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
    
    // Switch to content state (instant)
    showContentState();
    
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
    
    // Clear PNG display (will be populated after sigil generation)
    $pngStatus.textContent = 'Generating...';
    if ($pngDisplay) {
      $pngDisplay.innerHTML = '';
      $pngDisplay.classList.add('empty');
    }
  });
  
  // Sigil received - update moment card with sigil
  socket.on('sigil', async (data) => {
    console.log('🎨 Sigil received');
    
    // In DREAMING mode, clear Latest Percept when sigil arrives
    if (currentState === 'DREAMING' && currentPerceptExpanded) {
      console.log('💭 Dream sigil: clearing Latest Percept');
      currentPerceptExpanded.remove();
      currentPerceptExpanded = null;
      $perceptExpandedContainer.innerHTML = '';
    }
    
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
      
      // Check if PNG is included in the live event
      if (data.png && data.png.data) {
        console.log('📦 PNG received via WebSocket:', data.png.width, '×', data.png.height);
        
        // Decode base64 to create a data URL for preview
        const pngDataUrl = `data:image/png;base64,${data.png.data}`;
        
        // Update PNG status and preview immediately (no API call needed!)
        $pngStatus.innerHTML = `${data.png.width}×${data.png.height} · <a href="${pngDataUrl}" download="sigil.png">Download</a>`;
        if ($pngDisplay) {
          $pngDisplay.innerHTML = `<img src="${pngDataUrl}" alt="Sigil PNG" />`;
          $pngDisplay.classList.remove('empty');
        }
      } else {
        // Fallback: No PNG in event, fetch from API after DB save
        // This only happens if cognizer doesn't emit SDF (shouldn't happen with updated code)
        console.log('⚠️  No SDF in event, falling back to API fetch');
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
    }
  });
  
  // Clear display event (for dream mode lifecycle)
  socket.on('clearDisplay', ({ clearPercepts: shouldClearPercepts, clearMindMoment, clearSigil }) => {
    console.log('🧹 Clear display:', { clearPercepts: shouldClearPercepts, clearMindMoment, clearSigil });
    
    if (shouldClearPercepts) {
      // Clear both percept feed AND expanded component
      clearPercepts();
    }
    
    if (clearMindMoment) {
      // Clear all content instantly
      $momentCardContainer.innerHTML = '';
      $perceptsList.innerHTML = '';
      $priorMomentsList.innerHTML = '';
      $lighting.innerHTML = '<span class="lighting-text">—</span>';
      $timestamp.textContent = '—';
      $personalityName.textContent = '—';
      $sigilPromptName.textContent = '—';
      
      currentMomentCard = null;
      
      // Switch to collecting state (instant)
      showCollectingState();
    }
    
    if (clearSigil) {
      currentSigilCode = null;
      
      // Clear PNG display
      if ($pngDisplay) {
        $pngDisplay.innerHTML = '';
        $pngDisplay.classList.add('empty');
      }
      
      // Reset PNG status
      $pngStatus.textContent = '—';
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
 * Update or create moment card (uses hero version for main display)
 */
function updateMomentCard(data) {
  // If card doesn't exist, create it once
  if (!currentMomentCard) {
    currentMomentCard = new MomentCardHero(data);
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
 * Create percept PNG grid (64×64px icons in chronological order)
 */
function createPerceptPNGGrid(allPercepts) {
  const perceptsWithPNG = allPercepts.filter(({ percept }) => percept.pngData);
  
  if (perceptsWithPNG.length === 0) {
    return null; // No PNGs to display
  }
  
  // Sort by timestamp (oldest first - chronological order)
  perceptsWithPNG.sort((a, b) => {
    const timeA = new Date(a.percept.timestamp || 0).getTime();
    const timeB = new Date(b.percept.timestamp || 0).getTime();
    return timeA - timeB;
  });
  
  const gridContainer = document.createElement('div');
  gridContainer.className = 'percept-png-grid';
  
  perceptsWithPNG.forEach(({ percept, type }) => {
    const dataUrl = `data:image/png;base64,${percept.pngData}`;
    const title = percept.description || percept.sigilPhrase || percept.transcript || 'percept';
    
    const img = document.createElement('img');
    img.src = dataUrl;
    img.alt = title;
    img.title = title;
    img.className = 'percept-icon';
    
    gridContainer.appendChild(img);
  });
  
  return gridContainer;
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
 * Update sigil PNG display and percept PNG grid
 * @param {string} momentId - UUID of the mind moment
 * @param {Array} visualPercepts - Visual percepts with PNG data
 * @param {Array} audioPercepts - Audio percepts with PNG data
 */
async function updateSigilFormats(momentId, visualPercepts = [], audioPercepts = []) {
  if (!momentId) {
    $pngStatus.textContent = '—';
    if ($pngDisplay) {
      $pngDisplay.innerHTML = '';
      $pngDisplay.classList.add('empty');
    }
    return;
  }
  
  try {
    // Fetch sigil PNG info
    const response = await fetch(`/api/sigils/${momentId}/all`);
    const data = await response.json();
    
    // Update PNG status and preview
    if (data.png && data.png.available) {
      $pngStatus.innerHTML = `${data.png.width}×${data.png.height} · <a href="/api/sigils/${momentId}/png/raw" download="sigil-${data.cycle}.png" target="_blank">Download</a>`;
      
      // Show PNG preview as image
      if ($pngDisplay) {
        $pngDisplay.innerHTML = `<img src="/api/sigils/${momentId}/png/raw" alt="Sigil PNG" />`;
        $pngDisplay.classList.remove('empty');
      }
      
      // Display percept PNG grid in its own section with label
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
      
      const pngGrid = createPerceptPNGGrid(allPercepts);
      if (pngGrid && $perceptPngsSection && $perceptPngGridContainer) {
        $perceptPngGridContainer.innerHTML = '';
        $perceptPngGridContainer.appendChild(pngGrid);
        $perceptPngsSection.style.display = 'flex';
      } else if ($perceptPngsSection) {
        $perceptPngsSection.style.display = 'none';
      }
    } else {
      $pngStatus.textContent = 'Not generated';
      if ($pngDisplay) {
        $pngDisplay.innerHTML = '';
        $pngDisplay.classList.add('empty');
      }
      if ($perceptPngsSection) {
        $perceptPngsSection.style.display = 'none';
      }
    }
  } catch (error) {
    console.error('Failed to fetch sigil PNG:', error);
    $pngStatus.textContent = 'Error loading';
    if ($pngDisplay) {
      $pngDisplay.innerHTML = '';
      $pngDisplay.classList.add('empty');
    }
    if ($perceptPngsSection) {
      $perceptPngsSection.style.display = 'none';
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
  // Clear toast queue (no "Waiting" message)
  $percepts.innerHTML = '';
  
  // Clear expanded view and show appropriate waiting message
  if (currentPerceptExpanded) {
    currentPerceptExpanded.remove();
    currentPerceptExpanded = null;
  }
  
  // Show waiting message in expanded container based on state
  const waitingMessage = document.createElement('div');
  waitingMessage.className = 'percept-expanded-waiting';
  if (currentState === 'DREAMING') {
    waitingMessage.textContent = 'Collecting Dream Percepts...';
  } else {
    waitingMessage.textContent = 'Waiting for percepts...';
  }
  
  $perceptExpandedContainer.innerHTML = '';
  $perceptExpandedContainer.appendChild(waitingMessage);
}

/**
 * Add a percept toast to the display
 * @param {Object} data - Percept data with type and payload
 */
function addPercept(data) {
  // Remove waiting message if present
  const waiting = $perceptExpandedContainer.querySelector('.percept-expanded-waiting');
  if (waiting) waiting.remove();
  
  // Remove empty message from toast queue if present
  const empty = $percepts.querySelector('.empty');
  if (empty) empty.remove();
  
  // Build percept object for toast (normalize field names)
  const percept = {
    ...data.data,
    sigilPhrase: data.data?.sigilPhrase,
    sigilDrawCalls: data.data?.sigilDrawCalls || data.data?.drawCalls
  };
  
  // 1. Update PerceptExpanded (latest percept)
  if (currentPerceptExpanded) {
    currentPerceptExpanded.update(percept, data.type);
  } else {
    currentPerceptExpanded = new PerceptExpanded(percept, data.type);
    $perceptExpandedContainer.innerHTML = '';
    $perceptExpandedContainer.appendChild(currentPerceptExpanded.create());
  }
  
  // 2. Create and add toast to queue
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

// Set initial state - no session, show history, collecting percepts
document.body.classList.add('no-session');
showCollectingState();

connect();

