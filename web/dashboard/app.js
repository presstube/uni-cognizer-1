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
import { CircumplexViz } from '../perceptor-circumplex/circumplex-viz.js';

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
let currentMomentCard = null;
let currentSigilCode = null;
let historyGrid = null;
let currentPerceptExpanded = null;
let currentMode = 'LIVE';
let currentPhase = null;
let phaseStartTime = null;
let phaseDuration = null;
let nextPhaseCountdownInterval = null;
let exploringMode = false; // false = LIVE, true = EXPLORING

// ============================================
// DOM Elements
// ============================================

const $connection = document.getElementById('connection');
const $sessions = document.getElementById('sessions');
const $mode = document.getElementById('mode');
const $phase = document.getElementById('phase');
const $nextPhase = document.getElementById('next-phase');
const $cycle = document.getElementById('cycle');
const $center = document.querySelector('.center');
const $collectingState = document.getElementById('collecting-state');
const $contentState = document.getElementById('content-state');
const $momentCardContainer = document.getElementById('moment-card-container');
const $perceptsList = document.getElementById('percepts-list');
const $priorMomentsList = document.getElementById('prior-moments-list');
const $circumplexValues = document.getElementById('circumplex-values');
const $colorTriadDisplay = document.getElementById('color-triad-display');
const $timestamp = document.getElementById('timestamp');
const $personalityName = document.getElementById('personality-name');
const $sigilPromptName = document.getElementById('sigil-prompt-name');
const $pngStatus = document.getElementById('png-status');
const $pngDisplay = document.getElementById('sigil-png-display');
const $perceptPngsSection = document.getElementById('percept-pngs-section');
const $perceptPngStatus = document.getElementById('percept-png-status');
const $perceptPngGridContainer = document.getElementById('percept-png-grid-container');
const $percepts = document.getElementById('percepts');
const $perceptExpandedContainer = document.getElementById('percept-expanded-container');
const $collectingMessage = document.querySelector('.collecting-message');
const $historyGrid = document.getElementById('history-grid');
const $uniBrand = document.getElementById('uni-brand');

// ============================================
// Circumplex Visualization
// ============================================

let circumplexViz = null;

/**
 * Initialize Circumplex Visualization
 */
function initCircumplexViz() {
  try {
    circumplexViz = new CircumplexViz('circumplex-canvas', {
      size: 350,
      showLabels: true,
      showGrid: false
    });
    
    console.log('🎨 CircumplexViz initialized');
  } catch (error) {
    console.error('Failed to initialize CircumplexViz:', error);
  }
}

// Initialize CircumplexViz
initCircumplexViz();

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
  
  // Enter EXPLORING mode
  enterExploringMode(moment.cycle);
  
  // Switch to content state
  showContentState();
  
  // Scroll center pane to top
  // $center.scrollTop = 0;
  
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
  
  // Circumplex (emotional state)
  if (moment.circumplex) {
    const circumplex = typeof moment.circumplex === 'object' ? moment.circumplex : JSON.parse(moment.circumplex);
    updateCircumplexDisplay(circumplex);
  }
  
  // Color triad (emotional palette)
  if (moment.color) {
    const color = typeof moment.color === 'object' ? moment.color : JSON.parse(moment.color);
    updateColorTriadDisplay(color);
  } else {
    updateColorTriadDisplay(null);
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
  
  // Display sound brief
  displaySoundBrief(moment.sound_brief);
  
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
async function navigateHistory(offset) {
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
    // Fetch full moment details from API
    try {
      const response = await fetch(`/api/mind-moments/${selectedMoment.id}`);
      const data = await response.json();
      
      if (data.moment) {
        onHistoryMomentClick(data.moment);
      }
    } catch (error) {
      console.error('Failed to fetch moment details:', error);
    }
    
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
// Exploring Mode
// ============================================

/**
 * Enter EXPLORING mode - shows banner and blocks live updates
 */
function enterExploringMode(cycle) {
  exploringMode = true;
  document.body.classList.add('exploring-mode');
  
  // Show exploring banner
  showExploringBanner(cycle);
  
  console.log('📜 Entered EXPLORING mode - cycle #' + cycle);
}

/**
 * Exit EXPLORING mode - return to LIVE mode
 */
function exitExploringMode() {
  exploringMode = false;
  document.body.classList.remove('exploring-mode');
  
  // Remove banner
  const banner = document.querySelector('.exploring-banner');
  if (banner) banner.remove();
  
  // Deselect history grid items
  document.querySelectorAll('.sigil-cell').forEach(c => c.classList.remove('selected'));
  
  // Clear current view
  showCollectingState();
  
  // Request latest live data if socket is connected
  if (socket && socket.connected) {
    socket.emit('getCycleStatus');
  }
  
  console.log('🔴 Returned to LIVE mode');
}

/**
 * Show exploring mode banner
 */
function showExploringBanner(cycle) {
  // Remove existing banner if any
  const existing = document.querySelector('.exploring-banner');
  if (existing) existing.remove();
  
  const banner = document.createElement('div');
  banner.className = 'exploring-banner';
  banner.innerHTML = `
    <span class="exploring-label">📜 Exploring History - Cycle #${cycle}</span>
    <button class="exploring-exit-btn" onclick="window.exitExploringMode()">Return to Live ▶</button>
  `;
  
  // Insert at top of body
  document.body.insertBefore(banner, document.body.firstChild);
}

// Expose exitExploringMode globally for onclick handler
window.exitExploringMode = exitExploringMode;

// ============================================
// Socket.io Connection (READ-ONLY - no session)
// ============================================

/**
 * Update mode display
 */
function updateModeDisplay(mode) {
  currentMode = mode;
  $mode.textContent = mode;
  $mode.className = `value mode ${mode.toLowerCase()}`;
  
  // Update collecting message based on mode
  if ($collectingMessage) {
    if (mode === 'DREAM') {
      $collectingMessage.textContent = 'Collecting Dream Percepts...';
    } else {
      $collectingMessage.textContent = 'Collecting Percepts...';
    }
  }
}

/**
 * Update phase display
 */
function updatePhaseDisplay(phase) {
  currentPhase = phase;
  $phase.textContent = phase;
  $phase.className = `value phase ${phase.toLowerCase()}`;
}

/**
 * Update next phase countdown display
 */
function updateNextPhaseDisplay(nextPhase, timeRemaining) {
  if (!nextPhase) {
    $nextPhase.textContent = '—';
    return;
  }
  
  const seconds = Math.ceil(timeRemaining / 1000);
  $nextPhase.textContent = `${nextPhase} (${seconds}s)`;
  $nextPhase.className = `value next-phase ${nextPhase.toLowerCase()}`;
}

/**
 * Start next phase countdown
 * @param {string} nextPhase - Next phase name
 * @param {number} duration - Total phase duration in ms
 * @param {number} remainingMs - Optional: remaining ms if joining mid-phase
 */
function startNextPhaseCountdown(nextPhase, duration, remainingMs = null) {
  if (nextPhaseCountdownInterval) {
    clearInterval(nextPhaseCountdownInterval);
  }
  
  // If remainingMs provided, calculate adjusted start time
  if (remainingMs !== null && remainingMs > 0) {
    const elapsed = duration - remainingMs;
    phaseStartTime = Date.now() - elapsed;
    phaseDuration = duration;
  } else {
    phaseStartTime = Date.now();
    phaseDuration = duration;
  }
  
  nextPhaseCountdownInterval = setInterval(() => {
    const elapsed = Date.now() - phaseStartTime;
    const remaining = Math.max(0, phaseDuration - elapsed);
    
    updateNextPhaseDisplay(nextPhase, remaining);
    
    if (remaining <= 0) {
      clearInterval(nextPhaseCountdownInterval);
      nextPhaseCountdownInterval = null;
    }
  }, 100);
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
 * Handle the case when no sessions are active
 */
function handleNoActiveSessions() {
  $sessions.textContent = 'none';
  
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
  // Request fresh cycle status to sync displays
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
  
  // Cycle status response - initial sync of displays
  socket.on('cycleStatus', (status) => {
    console.log('📊 Cycle status:', status);
    cycleMs = status.intervalMs;
    
    // Update displays
    if (status.mode) {
      updateModeDisplay(status.mode);
      currentMode = status.mode;
    }
    
    if (status.phase) {
      updatePhaseDisplay(status.phase);
      currentPhase = status.phase;
      
      // Calculate next phase
      const phaseSequence = ['PERCEPTS', 'SPOOL', 'SIGILIN', 'SIGILHOLD', 'SIGILOUT', 'RESET'];
      const currentIndex = phaseSequence.indexOf(status.phase);
      const nextPhase = phaseSequence[(currentIndex + 1) % phaseSequence.length];
      
      // Store phase timing for countdown
      if (status.phaseDuration && status.msRemainingInPhase > 0) {
        // Start countdown with remaining time
        startNextPhaseCountdown(nextPhase, status.phaseDuration, status.msRemainingInPhase);
      }
    }
  });
  
  socket.on('disconnect', () => {
    console.log('⚫ Disconnected from Cognizer');
    $connection.textContent = 'Disconnected';
    $connection.className = 'value connection disconnected';
  });
  
  // Phase transitions (new 60s cycle system with enhanced fields)
  socket.on('phase', ({ phase, mode, nextPhase, duration, cycleNumber, isDream }) => {
    // Guard: ignore in EXPLORING mode
    if (exploringMode) {
      console.log('🔒 EXPLORING mode - ignoring phase transition');
      return;
    }
    
    const durationSec = (duration / 1000).toFixed(1);
    const modeLabel = isDream ? '💭 DREAM' : '🧠 LIVE';
    const cycleLabel = `Cycle ${cycleNumber}`;
    
    console.log(`┌─────────────────────────────────────────────────`);
    console.log(`│ ${modeLabel} ${cycleLabel}`);
    console.log(`│ PHASE: ${phase} (${durationSec}s) → ${nextPhase}`);
    console.log(`└─────────────────────────────────────────────────`);
    
    // Update displays
    updateModeDisplay(mode || (isDream ? 'DREAM' : 'LIVE'));
    updatePhaseDisplay(phase);
    startNextPhaseCountdown(nextPhase, duration);
    
    // Handle phase-specific UI transitions
    switch (phase) {
      case 'PERCEPTS':
        // Percepts will flow in via perceptReceived events
        // Just ensure we're in collecting state
        showCollectingState();
        break;
        
      case 'SPOOL':
        // Systems preparing - no action needed
        break;
        
      case 'SIGILIN':
        // Clear percept toast pane (percepts move to mind moment display)
        $percepts.innerHTML = '';
        console.log('  🧹 Cleared percept toast pane');
        break;
        
      case 'SIGILHOLD':
        // Sigil should already be drawn (comes via mindMoment/sigil events)
        // This phase just holds the display
        break;
        
      case 'SIGILOUT':
        // Clear sigil from main moment card
        if (currentMomentCard && currentMomentCard.sigil) {
          currentMomentCard.sigil.clear();
          console.log('  🧹 Cleared sigil from moment card');
        }
        break;
        
      case 'RESET':
        // Clear entire mind moment pane
        $momentCardContainer.innerHTML = '';
        $perceptsList.innerHTML = '';
        $priorMomentsList.innerHTML = '';
        if (circumplexViz) circumplexViz.clear();
        $circumplexValues.innerHTML = '<span class="circumplex-text">—</span>';
        $colorTriadDisplay.innerHTML = '<span class="color-text">—</span>';
        $timestamp.textContent = '—';
        $personalityName.textContent = '—';
        $sigilPromptName.textContent = '—';
        
        // Clear PNG display
        if ($pngDisplay) {
          $pngDisplay.innerHTML = '';
          $pngDisplay.classList.add('empty');
        }
        $pngStatus.textContent = '—';
        
        // Clear percept PNG grid
        if ($perceptPngsSection) {
          $perceptPngsSection.style.display = 'none';
        }
        
        currentMomentCard = null;
        currentSigilCode = null;
        
        console.log('  🧹 Cleared mind moment pane');
        break;
    }
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
  
  // Cycle started event (kept for compatibility)
  socket.on('cycleStarted', ({ cycle, cognitiveCycleMs }) => {
    console.log('🔄 Cycle started:', cycle);
    
    // Update cycle time if provided
    if (cognitiveCycleMs) {
      cycleMs = parseInt(cognitiveCycleMs, 10) || CONFIG.DEFAULT_CYCLE_MS;
    }
    
    // Don't clear percepts in EXPLORING mode
    if (!exploringMode) {
      clearPercepts();
    }
  });
  
  socket.on('perceptReceived', (data) => {
    // Guard: ignore in EXPLORING mode
    if (exploringMode) {
      console.log('🔒 EXPLORING mode - ignoring live perceptReceived');
      return;
    }
    
    console.log('👁️ Percept:', data.type);
    addPercept(data);
  });
  
  // Mind moment init - early notification when LLM completes (LIVE mode only)
  socket.on('mindMomentInit', (data) => {
    // Guard: ignore in EXPLORING mode
    if (exploringMode) {
      console.log('🔒 EXPLORING mode - ignoring live mindMomentInit');
      return;
    }
    
    console.log('⚡ Mind moment init (early):', data.mindMoment?.substring(0, 50) + '...');
    
    // Switch to content state (instant)
    showContentState();
    
    // Update cycle
    $cycle.textContent = data.cycle ? `#${data.cycle}` : '—';
    
    // Create/update moment card (without sigil yet)
    updateMomentCard({
      mindMoment: data.mindMoment,
      sigilPhrase: data.sigilPhrase,
      sigilCode: null // Wait for full mindMoment event
    });
    
    // Display percepts (shallow, no PNGs yet)
    displayPercepts(data.visualPercepts, data.audioPercepts);
    
    // Display prior mind moments
    displayPriorMoments(data.priorMoments);
    
    // Circumplex (emotional state)
    updateCircumplexDisplay(data.circumplex);
    
    // Color triad (emotional palette)
    updateColorTriadDisplay(data.color);
    
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
    
    // Show loading indicators based on status
    if (data.status) {
      $pngStatus.textContent = data.status.sigilReady ? 'Ready' : 'Generating sigil...';
    } else {
      $pngStatus.textContent = 'Generating...';
    }
    
    // Clear PNG display (will be populated when full mindMoment arrives)
    if ($pngDisplay) {
      $pngDisplay.innerHTML = '';
      $pngDisplay.classList.add('empty');
    }
  });
  
  // Mind moment received - update all fields and create moment card
  socket.on('mindMoment', (data) => {
    // Guard: ignore in EXPLORING mode
    if (exploringMode) {
      console.log('🔒 EXPLORING mode - ignoring live mindMoment');
      return;
    }
    
    console.log('🧠 Mind moment:', data.mindMoment?.substring(0, 50) + '...');
    
    // Switch to content state (instant)
    showContentState();
    
    // Update cycle
    $cycle.textContent = data.cycle ? `#${data.cycle}` : '—';
    
    // Create/update moment card with sigil code (now included in mindMoment)
    updateMomentCard({
      mindMoment: data.mindMoment,
      sigilPhrase: data.sigilPhrase,
      sigilCode: data.sigilCode // ✅ Now included in mindMoment payload
    });
    
    // Display percepts
    displayPercepts(data.visualPercepts, data.audioPercepts);
    
    // Display prior mind moments
    displayPriorMoments(data.priorMoments);
    
    // Circumplex (emotional state)
    updateCircumplexDisplay(data.circumplex);
    
    // Color triad (emotional palette)
    updateColorTriadDisplay(data.color);
    
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
    
    // Display sound brief (if available)
    displaySoundBrief(data.soundBrief);
    
    // Display PNG if available
    if (data.sigilPNG) {
      displaySigilPNG(data.sigilPNG);
    } else {
      $pngStatus.textContent = 'No PNG available';
      if ($pngDisplay) {
        $pngDisplay.innerHTML = '';
        $pngDisplay.classList.add('empty');
      }
    }
    
    // In DREAM mode, clear Latest Percept when moment arrives
    if (currentMode === 'DREAM' && currentPerceptExpanded) {
      console.log('💭 Dream moment: clearing Latest Percept');
      currentPerceptExpanded.remove();
      currentPerceptExpanded = null;
      $perceptExpandedContainer.innerHTML = '';
    }
  });
  
  // Sigil received - update moment card with sigil
  socket.on('sigil', async (data) => {
    // Guard: ignore in EXPLORING mode
    if (exploringMode) {
      console.log('🔒 EXPLORING mode - ignoring live sigil');
      return;
    }
    
    console.log('🎨 Sigil received');
    
    // In DREAM mode, clear Latest Percept when sigil arrives
    if (currentMode === 'DREAM' && currentPerceptExpanded) {
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
        
        // Update PNG status - dimensions only
        $pngStatus.textContent = `${data.png.width}×${data.png.height}`;
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
    // Guard: ignore in EXPLORING mode
    if (exploringMode) {
      console.log('🔒 EXPLORING mode - ignoring clearDisplay');
      return;
    }
    
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
      if (circumplexViz) circumplexViz.clear();
      $circumplexValues.innerHTML = '<span class="circumplex-text">—</span>';
      $colorTriadDisplay.innerHTML = '<span class="color-text">—</span>';
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
 * @returns {Object|null} { grid: HTMLElement, count: number, dimensions: string } or null
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
  
  // Get dimensions from first percept (they should all be 256×256)
  const firstPercept = perceptsWithPNG[0].percept;
  const dimensions = `${firstPercept.pngWidth || 256}×${firstPercept.pngHeight || 256}`;
  
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
  
  return {
    grid: gridContainer,
    count: perceptsWithPNG.length,
    dimensions
  };
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
 * Update circumplex display with valence and arousal values
 */
function updateCircumplexDisplay(circumplex) {
  if (!circumplex) {
    if (circumplexViz) circumplexViz.clear();
    $circumplexValues.innerHTML = '<span class="circumplex-text">—</span>';
    return;
  }
  
  const valence = circumplex.valence !== undefined ? circumplex.valence : 0;
  const arousal = circumplex.arousal !== undefined ? circumplex.arousal : 0;
  
  // Update visualization
  if (circumplexViz) {
    circumplexViz.plot(valence, arousal);
  }
  
  // Update text values
  $circumplexValues.innerHTML = `
    <span class="circumplex-text">
      Valence: <strong>${valence.toFixed(2)}</strong> · Arousal: <strong>${arousal.toFixed(2)}</strong>
    </span>
  `;
}

/**
 * Update color triad display with primary, secondary, and accent colors
 */
function updateColorTriadDisplay(color) {
  if (!color || !color.primary || !color.secondary || !color.accent) {
    $colorTriadDisplay.innerHTML = '<span class="color-text">—</span>';
    return;
  }
  
  $colorTriadDisplay.innerHTML = `
    <div class="color-swatch-row">
      <div class="color-swatch" style="background-color: ${color.primary};"></div>
      <div class="color-info">
        <div class="color-label">Primary</div>
        <div class="color-value">${color.primary}</div>
      </div>
    </div>
    <div class="color-swatch-row">
      <div class="color-swatch" style="background-color: ${color.secondary};"></div>
      <div class="color-info">
        <div class="color-label">Secondary</div>
        <div class="color-value">${color.secondary}</div>
      </div>
    </div>
    <div class="color-swatch-row">
      <div class="color-swatch" style="background-color: ${color.accent};"></div>
      <div class="color-info">
        <div class="color-label">Accent</div>
        <div class="color-value">${color.accent}</div>
      </div>
    </div>
  `;
}

/**
 * Display sigil PNG in dashboard
 * @param {Object} pngData - PNG data with width, height, data (base64)
 */
function displaySigilPNG(pngData) {
  if (!$pngDisplay || !pngData || !pngData.data) {
    return;
  }
  
  $pngStatus.textContent = `${pngData.width}×${pngData.height}`;
  
  const img = document.createElement('img');
  img.src = `data:image/png;base64,${pngData.data}`;
  img.alt = 'Sigil PNG';
  img.style.maxWidth = '100%';
  img.style.height = 'auto';
  
  $pngDisplay.innerHTML = '';
  $pngDisplay.appendChild(img);
  $pngDisplay.classList.remove('empty');
}

/**
 * Display sound brief in dashboard
 * @param {Object|null} soundBrief - Sound generation result
 */
function displaySoundBrief(soundBrief) {
  const $section = document.getElementById('sound-brief-section');
  const $display = document.getElementById('sound-brief-display');
  
  if (!soundBrief || !soundBrief.valid) {
    $section.style.display = 'none';
    return;
  }
  
  const { selections, reasoning, musicSample, textureSample } = soundBrief;
  
  let html = '';
  
  // Reasoning (if present)
  if (reasoning) {
    html += `<div class="sound-brief-reasoning">${reasoning}</div>`;
  }
  
  // Samples section
  html += `<div class="sound-samples">`;
  
  // Music sample
  html += `
    <div class="sound-sample-row">
      <span class="sound-sample-icon">🎵</span>
      <span class="sound-sample-label">Music</span>
      <span class="sound-sample-value">${selections.music_filename}</span>
  `;
  if (musicSample && musicSample.scale) {
    const keyInfo = musicSample.key ? ` · ${musicSample.key}` : '';
    html += `<span class="sound-sample-meta">${musicSample.scale}${keyInfo}</span>`;
  }
  html += `</div>`;
  
  // Texture sample
  html += `
    <div class="sound-sample-row">
      <span class="sound-sample-icon">🌊</span>
      <span class="sound-sample-label">Texture</span>
      <span class="sound-sample-value">${selections.texture_filename}</span>
    </div>
  `;
  
  html += `</div>`; // Close sound-samples
  
  // Bass parameters
  html += `<div class="sound-param-group">`;
  html += `<div class="sound-param-group-title">Bass</div>`;
  html += `<div class="sound-preset">🎚️ ${selections.bass_preset}</div>`;
  
  ['speed', 'stability', 'coloration', 'scale'].forEach(param => {
    const value = parseFloat(selections[`bass_${param}`]);
    const percentage = (value * 100).toFixed(0);
    
    html += `
      <div class="sound-param" data-param="${param}">
        <div class="sound-param-header">
          <span class="sound-param-label">${param}</span>
          <span class="sound-param-value">${value.toFixed(2)}</span>
        </div>
        <div class="sound-param-bar">
          <div class="sound-param-bar-fill" style="width: ${percentage}%"></div>
        </div>
      </div>
    `;
  });
  
  html += `</div>`; // Close bass group
  
  // Melody parameters
  html += `<div class="sound-param-group">`;
  html += `<div class="sound-param-group-title">Melody</div>`;
  
  ['speed', 'stability', 'coloration', 'scale'].forEach(param => {
    const value = parseFloat(selections[`melody_${param}`]);
    const percentage = (value * 100).toFixed(0);
    
    html += `
      <div class="sound-param" data-param="${param}">
        <div class="sound-param-header">
          <span class="sound-param-label">${param}</span>
          <span class="sound-param-value">${value.toFixed(2)}</span>
        </div>
        <div class="sound-param-bar">
          <div class="sound-param-bar-fill" style="width: ${percentage}%"></div>
        </div>
      </div>
    `;
  });
  
  html += `</div>`; // Close melody group
  
  $display.innerHTML = html;
  $section.style.display = 'flex';
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
      $pngStatus.textContent = `${data.png.width}×${data.png.height}`;
      
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
      
      const pngGridResult = createPerceptPNGGrid(allPercepts);
      if (pngGridResult && $perceptPngsSection && $perceptPngGridContainer) {
        $perceptPngGridContainer.innerHTML = '';
        $perceptPngGridContainer.appendChild(pngGridResult.grid);
        $perceptPngStatus.textContent = `${pngGridResult.count} × ${pngGridResult.dimensions}`;
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
  
  // Show waiting message in expanded container based on mode
  const waitingMessage = document.createElement('div');
  waitingMessage.className = 'percept-expanded-waiting';
  if (currentMode === 'DREAM') {
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

