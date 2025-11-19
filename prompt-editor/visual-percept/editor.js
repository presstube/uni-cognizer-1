import { Sigil } from './sigil.standalone.js';
import { typewrite } from './typewriter.js';
import { MotionDetector } from './motion-detector.js';

// ============================================
// SECTION 1: State Management
// ============================================

// Load settings from localStorage
function loadSettings() {
  const saved = localStorage.getItem('visualPerceptSettings');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to parse saved settings:', e);
    }
  }
  return {};
}

// Save settings to localStorage
function saveSettings(settings) {
  try {
    const current = loadSettings();
    const updated = { ...current, ...settings };
    localStorage.setItem('visualPerceptSettings', JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to save settings:', e);
  }
}

// Application state
const savedSettings = loadSettings();
const state = {
  ws: null,               // Raw WebSocket connection
  stream: null,            // MediaStream from webcam
  videoElement: null,      // Video element reference
  currentPromptId: null,   // Database ID of loaded prompt
  isConnected: false,      // Session connection status
  responseBuffer: '',      // Accumulated response text
  sigil: null,             // Sigil instance
  isContinuous: false,     // Continuous mode flag
  continuousTimer: null,   // Timer for continuous mode
  continuousInterval: savedSettings.continuousInterval || 2000, // Interval in ms (saved in LSO)
  motionDetector: null,    // Motion detector instance
  currentMotion: 0,        // Current motion percentage (0-100)
  displayedMotion: 0,      // Smoothed motion value for display
  motionEnabled: savedSettings.motionEnabled ?? false,           // Motion auto-send enabled (saved in LSO)
  motionThreshold: savedSettings.motionThreshold || 35,         // Motion threshold percentage (saved in LSO)
  isInMotion: false,       // Track if currently above threshold
  visualizerSide: null,    // Track which side of visualizer we're on ('green' or 'red')
  motionHistory: [],       // Rolling window of recent motion values
  motionHistorySize: 10,   // Number of frames to average (10 frames ~= 166ms @ 60fps)
  motionSensitivity: savedSettings.motionSensitivity || 150000, // Motion sensitivity (saved in LSO)
  isRequestInFlight: false,// Track if a request is currently being processed
  lastFlashTime: 0,        // Timestamp of last flash
  lastResponseTime: 0      // Timestamp of last response completion
};

// Update state (immutable pattern)
function updateState(updates) {
  Object.assign(state, updates);
  updateUI();
}

// ============================================
// SECTION 2: Webcam Management
// ============================================

async function initWebcam() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { 
        width: { ideal: 640 }, 
        height: { ideal: 480 },
        facingMode: 'user'
      },
      audio: false
    });
    
    const video = document.getElementById('webcam');
    video.srcObject = stream;
    
    // Wait for video to be ready
    await new Promise((resolve) => {
      video.onloadedmetadata = () => {
        video.play().then(resolve);
      };
    });
    
    updateState({ stream, videoElement: video });
    console.log('✅ Webcam initialized');
    
  } catch (error) {
    showError('Failed to access webcam: ' + error.message);
    console.error('Webcam error:', error);
  }
}

function captureFrame() {
  if (!state.videoElement) {
    throw new Error('Video element not initialized');
  }
  
  const video = state.videoElement;
  
  // Check if video is ready
  if (video.readyState < 2 || !video.videoWidth) {
    throw new Error('Video not ready');
  }
  
  // Create canvas and capture frame
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  
  const ctx = canvas.getContext('2d');
  ctx.drawImage(video, 0, 0);
  
  // Convert to base64 JPEG
  const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
  const base64Data = dataUrl.split(',')[1];
  
  return base64Data;
}

// ============================================
// SECTION 2.5: Motion Detection
// ============================================

// Smooth lerp (linear interpolation)
function lerp(start, end, factor) {
  return start + (end - start) * factor;
}

function startMotionDetection() {
  function detectLoop() {
    if (state.motionDetector && state.stream) {
      const rawMotion = state.motionDetector.detect();
      const normalizedMotion = state.motionDetector.getNormalized();
      
      // Add to rolling history
      state.motionHistory.push(normalizedMotion);
      
      // Keep only the last N frames
      if (state.motionHistory.length > state.motionHistorySize) {
        state.motionHistory.shift();
      }
      
      // Calculate temporal average (no lerp - just the rolling average)
      const sum = state.motionHistory.reduce((acc, val) => acc + val, 0);
      const average = sum / state.motionHistory.length;
      
      // Use maximum value in window to combat frame-differencing oscillation
      const maximum = Math.max(...state.motionHistory);
      
      // Use max instead of average to better capture motion peaks
      const smoothedMotion = maximum;
      
      // Normalize to 0-1 range for visualization
      const normalizedSmoothed = smoothedMotion / 100;
      const normalizedThreshold = state.motionThreshold / 100;
      
      updateState({ 
        currentMotion: normalizedMotion,
        displayedMotion: smoothedMotion
      });
      
      // Update UI with smoothed value
      const motionValue = document.getElementById('motion-value');
      if (motionValue) {
        motionValue.textContent = `${Math.round(smoothedMotion)}%`;
      }
      
      // Update visualizer
      updateMotionVisualizer(normalizedSmoothed, normalizedThreshold);
      
      // Edge detection: Trigger when motion STOPS (falls below threshold)
      // IMPORTANT: Use smoothed motion for stable edge detection
      const wasInMotion = state.isInMotion;
      const isNowInMotion = smoothedMotion >= state.motionThreshold;
      
      // Detect falling edge: was above threshold, now below (motion stopped!)
      // Only trigger if no request is in-flight
      if (wasInMotion && !isNowInMotion && !state.isRequestInFlight) {
        console.log(`📸 Motion stopped! (${Math.round(smoothedMotion)}% < ${state.motionThreshold}%)`);
        
        // Note: Flash now triggered by visualizer side change (red → green)
        
        // Auto-send if enabled
        if (state.motionEnabled && !state.isContinuous) {
          sendFrame().catch(err => console.error('Motion auto-send failed:', err));
        }
      }
      
      // Update motion state AFTER checking edge (critical for edge detection!)
      updateState({ isInMotion: isNowInMotion });
    }
    
    requestAnimationFrame(detectLoop);
  }
  
  detectLoop();
}

// Update motion visualizer bar
function updateMotionVisualizer(motionNormalized, thresholdNormalized) {
  const barBg = document.getElementById('motion-bar-bg');
  const indicator = document.getElementById('motion-indicator');
  const thresholdLine = document.getElementById('threshold-line');
  
  if (!barBg || !indicator || !thresholdLine) return;
  
  // Update threshold position (red/green split)
  const thresholdPercent = thresholdNormalized * 100;
  barBg.style.setProperty('--threshold', `${thresholdPercent}%`);
  thresholdLine.style.left = `${thresholdPercent}%`;
  
  // Update blue indicator (current motion)
  const motionPercent = motionNormalized * 100;
  indicator.style.left = `${motionPercent}%`;
  
  // Add hysteresis (2% deadzone) to prevent rapid toggling at boundary
  const HYSTERESIS = 0.02; // 2% deadzone
  let currentSide;
  
  if (state.visualizerSide === null) {
    // Initial state - no hysteresis
    currentSide = motionNormalized < thresholdNormalized ? 'green' : 'red';
  } else if (state.visualizerSide === 'green') {
    // Currently on green side - need to cross threshold + hysteresis to switch to red
    currentSide = motionNormalized < (thresholdNormalized + HYSTERESIS) ? 'green' : 'red';
  } else {
    // Currently on red side - need to cross threshold - hysteresis to switch to green
    currentSide = motionNormalized < (thresholdNormalized - HYSTERESIS) ? 'green' : 'red';
  }
  
  // Detailed logging when near threshold
  const distanceFromThreshold = Math.abs(motionNormalized - thresholdNormalized);
  if (distanceFromThreshold < 0.05) {
    console.log(`🔬 Near threshold - Motion: ${(motionNormalized * 100).toFixed(2)}%, Threshold: ${(thresholdNormalized * 100).toFixed(2)}%, Distance: ${(distanceFromThreshold * 100).toFixed(2)}%, Side: ${currentSide}`);
  }
  
  // Only update classes if side has changed (prevents flickering)
  if (state.visualizerSide !== currentSide) {
    console.log(`🎨 Visualizer: ${state.visualizerSide} → ${currentSide}`);
    
    // Flash ONLY when green becomes ACTIVE (red → green transition ONLY)
    // Check cooldown based on auto-send mode
    let canFlash = !state.isRequestInFlight;
    
    if (canFlash) {
      const now = Date.now();
      if (state.motionEnabled) {
        // If auto-send is ON: cooldown from last response
        const timeSinceResponse = now - state.lastResponseTime;
        canFlash = timeSinceResponse >= state.continuousInterval;
      } else {
        // If auto-send is OFF: cooldown from last flash
        const timeSinceFlash = now - state.lastFlashTime;
        canFlash = timeSinceFlash >= state.continuousInterval;
      }
    }
    
    if (state.visualizerSide === 'red' && currentSide === 'green' && canFlash) {
      console.log('⚡ Flash triggered');
      triggerVideoFlash();
      updateState({ lastFlashTime: Date.now() });
    }
    
    if (currentSide === 'green') {
      // Blue is on green side (below threshold)
      barBg.classList.remove('red-active');
      barBg.classList.add('green-active');
    } else {
      // Blue is on red side (above threshold)
      barBg.classList.remove('green-active');
      barBg.classList.add('red-active');
    }
    
    // Update state
    state.visualizerSide = currentSide;
  }
}

// Trigger white flash overlay on video
function triggerVideoFlash() {
  const flash = document.getElementById('video-flash');
  if (!flash) return;
  
  // Add active class (instant opacity 0.8)
  flash.classList.add('active');
  
  // Remove after a brief moment to trigger fade-out
  setTimeout(() => {
    flash.classList.remove('active');
  }, 50); // 50ms flash duration
}

// ============================================
// SECTION 3: Continuous Mode
// ============================================

function startContinuousMode() {
  if (state.isContinuous) return; // Already running
  
  updateState({ isContinuous: true });
  
  // Update UI
  const btn = document.getElementById('continuous-btn');
  btn.classList.add('active');
  btn.textContent = '⏸ STOP';
  
  // Start the loop
  continuousLoop();
  
  console.log('✅ Continuous mode started');
}

function stopContinuousMode() {
  updateState({ isContinuous: false });
  
  // Clear timer
  if (state.continuousTimer) {
    clearTimeout(state.continuousTimer);
    updateState({ continuousTimer: null });
  }
  
  // Update UI
  const btn = document.getElementById('continuous-btn');
  btn.classList.remove('active');
  btn.textContent = '🔄 CONTINUOUS';
  
  console.log('⏹ Continuous mode stopped');
}

function toggleContinuousMode() {
  if (state.isContinuous) {
    stopContinuousMode();
  } else {
    startContinuousMode();
  }
}

async function continuousLoop() {
  if (!state.isContinuous) return;
  
  try {
    await sendFrame();
  } catch (error) {
    console.error('Continuous mode error:', error);
    // Don't stop on errors, just continue
  }
  
  // Schedule next frame
  const interval = parseInt(document.getElementById('interval-input').value) || 1000;
  updateState({ continuousInterval: interval });
  
  const timer = setTimeout(continuousLoop, interval);
  updateState({ continuousTimer: timer });
}

// ============================================
// SECTION 4: WebSocket Connection (Raw)
// ============================================

const WS_BASE = 'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService';

function createWebSocketUrl(token) {
  const isEphemeralToken = token.startsWith('auth_tokens/');
  const endpoint = isEphemeralToken ? 'BidiGenerateContentConstrained' : 'BidiGenerateContent';
  const param = isEphemeralToken ? 'access_token' : 'key';
  return `${WS_BASE}.${endpoint}?${param}=${token}`;
}

async function startSession() {
  if (state.ws) {
    console.log('WebSocket already active');
    return;
  }
  
  try {
    // Get ephemeral token
    const tokenRes = await fetch('/api/gemini/token');
    if (!tokenRes.ok) {
      throw new Error(`Token fetch failed: ${tokenRes.status}`);
    }
    const { token } = await tokenRes.json();
    console.log('✅ Got ephemeral token');
    
    // Create raw WebSocket connection
    const url = createWebSocketUrl(token);
    const ws = new WebSocket(url);
    
    ws.onopen = () => {
      console.log('✅ WebSocket connection opened');
      
      // Send setup message
      const systemPrompt = document.getElementById('system-prompt').value;
      const setupMessage = {
        setup: {
          model: 'models/gemini-2.0-flash-exp',
          generationConfig: {
            responseModalities: ['TEXT'],
            responseMimeType: 'application/json'
          },
          systemInstruction: {
            parts: [{
              text: systemPrompt || 'You are analyzing visual percepts.'
            }]
          }
        }
      };
      
      console.log('📤 Sending setup message');
      ws.send(JSON.stringify(setupMessage));
    };
    
    ws.onmessage = async (event) => {
      try {
        const data = event.data instanceof Blob 
          ? JSON.parse(await event.data.text())
          : JSON.parse(event.data);
        
        handleResponse(data);
      } catch (error) {
        console.error('❌ Error parsing message:', error);
      }
    };
    
    ws.onerror = (error) => {
      console.error('❌ WebSocket error:', error);
      showError('WebSocket error: ' + error.message);
    };
    
    ws.onclose = (event) => {
      console.log('WebSocket closed:', event.reason);
      updateState({ isConnected: false, ws: null });
      updateStatus('⚫ Disconnected');
    };
    
    updateState({ ws });
    
  } catch (error) {
    console.error('Failed to start session:', error);
    showError('Failed to start session: ' + error.message);
  }
}

async function sendFrame() {
  try {
    // Set in-flight flag to disable flash/send system
    updateState({ isRequestInFlight: true });
    console.log('🚀 Request in-flight - flash/send disabled');
    
    // Ensure session exists
    if (!state.ws) {
      await startSession();
      // Wait for setup to complete
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Check if connected
    if (!state.ws || state.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not ready');
    }
    
    // Capture frame
    const base64Frame = captureFrame();
    console.log('📸 Captured frame');
    
    // Get user prompt
    const userPrompt = document.getElementById('user-prompt').value 
      || 'What do you see in this frame?';
    
    // Clear previous response
    state.responseBuffer = '';
    updateResponseDisplay();
    
    // Start typewriter for "awaiting sigil..." and varied thinking animation
    const phraseElement = document.getElementById('sigil-phrase');
    typewrite(phraseElement, 'awaiting sigil...', 20);
    if (state.sigil) {
      state.sigil.thinkingVaried();
    }
    
    // Build message (matching cam-tick format)
    const message = {
      clientContent: {
        turns: [{
          role: 'user',
          parts: [
            {
              inlineData: {
                mimeType: 'image/jpeg',
                data: base64Frame
              }
            },
            {
              text: userPrompt
            }
          ]
        }],
        turnComplete: true
      }
    };
    
    console.log('📤 Sending frame message');
    state.ws.send(JSON.stringify(message));
    
    console.log('✅ Frame sent to Live API');
    updateStatus('🟡 Processing...');
    
  } catch (error) {
    console.error('Failed to send frame:', error);
    showError('Failed to send frame: ' + error.message);
    // Re-enable on error
    updateState({ isRequestInFlight: false });
  }
}

function handleResponse(message) {
  // Handle streaming response from Live API
  console.log('📥 Message received:', message);
  
  // Skip setup messages
  if (message.setupComplete) {
    console.log('Setup complete, waiting for content...');
    updateState({ isConnected: true });
    updateStatus('🟢 Connected');
    return;
  }
  
  if (message.serverContent) {
    const content = message.serverContent;
    
    // Extract text from response
    if (content.modelTurn && content.modelTurn.parts) {
      for (const part of content.modelTurn.parts) {
        if (part.text) {
          state.responseBuffer += part.text;
          updateResponseDisplay();
        }
      }
    }
    
    // Check if turn is complete
    if (content.turnComplete) {
      console.log('✅ Turn complete');
      updateStatus('🟢 Connected');
      
      // Re-enable flash/send system now that response has arrived
      updateState({ 
        isRequestInFlight: false,
        lastResponseTime: Date.now()
      });
      console.log('✅ Request complete - flash/send re-enabled');
      
      // Try to parse and render sigil
      try {
        // Strip markdown code fences if present
        let jsonText = state.responseBuffer.trim();
        
        // Remove ```json and ``` wrappers
        if (jsonText.startsWith('```')) {
          jsonText = jsonText.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '');
        }
        
        const data = JSON.parse(jsonText);
        if (data.sigilPhrase && data.drawCalls) {
          renderSigil(data.sigilPhrase, data.drawCalls);
        }
      } catch (error) {
        console.log('Response not JSON or missing sigil data:', error.message);
      }
    }
  }
}

// ============================================
// SECTION 4: Sigil Rendering
// ============================================

function renderSigil(phrase, drawCalls) {
  try {
    console.log('🎨 Rendering sigil:', phrase);
    console.log('📋 Draw calls type:', typeof drawCalls);
    console.log('📋 Draw calls value:', drawCalls);
    
    // Validate inputs
    if (!drawCalls || typeof drawCalls !== 'string') {
      throw new Error(`Invalid drawCalls: expected string, got ${typeof drawCalls}`);
    }
    
    // Fix orphaned lines: Ensure moveTo before arc() calls
    // This prevents unwanted connecting lines to arc starting points
    const fixedDrawCalls = drawCalls.replace(
      /ctx\.arc\(/g,
      (match, offset) => {
        // Check if there's already a moveTo on the previous line
        const beforeArc = drawCalls.substring(Math.max(0, offset - 50), offset);
        if (beforeArc.includes('moveTo')) {
          return match; // Already has moveTo, leave it
        }
        // Add moveTo to arc center before drawing arc
        // Extract arc parameters: arc(x, y, radius, ...)
        const arcCall = drawCalls.substring(offset, offset + 100);
        const params = arcCall.match(/ctx\.arc\(([^,]+),\s*([^,]+),/);
        if (params) {
          const [, x, y] = params;
          return `ctx.moveTo(${x},${y});\nctx.arc(`;
        }
        return match;
      }
    );
    
    console.log('📋 Fixed draw calls:', fixedDrawCalls);
    
    // Typewrite the phrase (faster for actual sigil phrases)
    const phraseElement = document.getElementById('sigil-phrase');
    typewrite(phraseElement, phrase.toLowerCase(), 10);
    
    // Draw the sigil (automatically stops thinking animation)
    // Note: drawSigil expects an object with a 'calls' property
    if (state.sigil) {
      state.sigil.drawSigil({ calls: fixedDrawCalls });
    }
  } catch (error) {
    console.error('Failed to render sigil:', error);
    showError('Failed to render sigil: ' + error.message);
  }
}

// ============================================
// SECTION 5: UI Updates
// ============================================

function updateUI() {
  // Update connection status
  updateStatus(state.isConnected ? '🟢 Connected' : '⚫ Disconnected');
  
  // Enable/disable capture button
  const captureBtn = document.getElementById('capture-btn');
  captureBtn.disabled = !state.videoElement;
}

function updateStatus(text) {
  const statusEl = document.getElementById('status');
  statusEl.textContent = text;
  statusEl.className = 'status ' + (
    text.includes('🟢') ? 'status-connected' :
    text.includes('🟡') ? 'status-processing' :
    'status-disconnected'
  );
}

function updateResponseDisplay() {
  const responseEl = document.getElementById('response-text');
  responseEl.textContent = state.responseBuffer;
  
  // Auto-scroll to bottom
  responseEl.scrollTop = responseEl.scrollHeight;
}

function showError(message) {
  const errorEl = document.getElementById('error');
  errorEl.textContent = '❌ ' + message;
  errorEl.classList.remove('hidden');
  
  // Auto-hide after 5 seconds
  setTimeout(() => {
    errorEl.classList.add('hidden');
  }, 5000);
}

// Character counters
function updateCharCount(textareaId, counterId) {
  const textarea = document.getElementById(textareaId);
  const counter = document.getElementById(counterId);
  counter.textContent = `${textarea.value.length} chars`;
}

// ============================================
// SECTION 5: Event Handlers
// ============================================

// Capture button
document.getElementById('capture-btn').addEventListener('click', async () => {
  const btn = document.getElementById('capture-btn');
  btn.disabled = true;
  btn.textContent = '⏳ Sending...';
  
  try {
    await sendFrame();
  } finally {
    btn.disabled = false;
    btn.textContent = '📸 SEND FRAME';
  }
});

// Continuous mode toggle
document.getElementById('continuous-btn').addEventListener('click', () => {
  toggleContinuousMode();
});

// Interval input
document.getElementById('interval-input').addEventListener('change', (e) => {
  const value = parseInt(e.target.value);
  if (value >= 500 && value <= 10000) {
    updateState({ continuousInterval: value });
    saveSettings({ continuousInterval: value });
    console.log(`⏱ Interval set to ${value}ms`);
  }
});

// Motion enabled toggle
document.getElementById('motion-enabled').addEventListener('change', (e) => {
  const enabled = e.target.checked;
  updateState({ motionEnabled: enabled });
  saveSettings({ motionEnabled: enabled });
  console.log(`🎯 Motion auto-send: ${enabled ? 'ON' : 'OFF'}`);
});

// Motion threshold slider
document.getElementById('motion-threshold').addEventListener('input', (e) => {
  const value = parseInt(e.target.value);
  updateState({ motionThreshold: value });
  saveSettings({ motionThreshold: value });
  document.getElementById('motion-threshold-value').textContent = `${value}%`;
  
  // Update visualizer threshold immediately
  const normalized = value / 100;
  const barBg = document.getElementById('motion-bar-bg');
  const thresholdLine = document.getElementById('threshold-line');
  if (barBg) barBg.style.setProperty('--threshold', `${value}%`);
  if (thresholdLine) thresholdLine.style.left = `${value}%`;
});

// Motion sensitivity slider
document.getElementById('motion-sensitivity').addEventListener('input', (e) => {
  const sensitivity = parseInt(e.target.value);
  if (state.motionDetector) {
    state.motionDetector.setSensitivity(sensitivity);
  }
  updateState({ motionSensitivity: sensitivity });
  saveSettings({ motionSensitivity: sensitivity });
  // Format for display: 50000 → "50k", 150000 → "150k"
  const displayValue = sensitivity >= 1000 ? `${Math.round(sensitivity / 1000)}k` : sensitivity;
  document.getElementById('sensitivity-value').textContent = displayValue;
});

// Clear response button
document.getElementById('clear-response-btn').addEventListener('click', () => {
  state.responseBuffer = '';
  updateResponseDisplay();
  
  // Clear sigil phrase and restart thinking animation
  document.getElementById('sigil-phrase').textContent = '';
  if (state.sigil) {
    state.sigil.thinkingVaried();
  }
});

// Character counters
document.getElementById('system-prompt').addEventListener('input', () => {
  updateCharCount('system-prompt', 'system-char-count');
});

document.getElementById('user-prompt').addEventListener('input', () => {
  updateCharCount('user-prompt', 'user-char-count');
});

// Save button (placeholder)
document.getElementById('save-btn').addEventListener('click', () => {
  showError('Save functionality not yet implemented');
});

// Activate button (placeholder)
document.getElementById('activate-btn').addEventListener('click', () => {
  showError('Activate functionality not yet implemented');
});

// Delete button (placeholder)
document.getElementById('delete-btn').addEventListener('click', () => {
  showError('Delete functionality not yet implemented');
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  // L key: Log localStorage settings
  if (e.key === 'l' || e.key === 'L') {
    const settings = loadSettings();
    console.log('📦 Current localStorage settings:');
    console.log(JSON.stringify(settings, null, 2));
    console.log('\n// Defaults for code:');
    console.log(`continuousInterval: ${settings.continuousInterval || 2000}`);
    console.log(`motionEnabled: ${settings.motionEnabled ?? true}`);
    console.log(`motionThreshold: ${settings.motionThreshold || 35}`);
    console.log(`motionSensitivity: ${settings.motionSensitivity || 150000}`);
  }
});

// ============================================
// SECTION 6: Initialization
// ============================================

async function init() {
  console.log('🚀 Initializing Visual Percept Prompt Editor');
  
  // Restore saved UI values
  document.getElementById('interval-input').value = state.continuousInterval;
  document.getElementById('motion-enabled').checked = state.motionEnabled;
  document.getElementById('motion-threshold').value = state.motionThreshold;
  document.getElementById('motion-threshold-value').textContent = `${state.motionThreshold}%`;
  document.getElementById('motion-sensitivity').value = state.motionSensitivity;
  const displayValue = state.motionSensitivity >= 1000 ? `${Math.round(state.motionSensitivity / 1000)}k` : state.motionSensitivity;
  document.getElementById('sensitivity-value').textContent = displayValue;
  
  // Initialize webcam
  await initWebcam();
  
  // Initialize motion detector with saved sensitivity
  if (state.videoElement) {
    state.motionDetector = new MotionDetector(state.videoElement, {
      threshold: 25,
      maxScore: state.motionSensitivity
    });
    startMotionDetection();
    console.log('✅ Motion detection initialized');
  }
  
  // Initialize sigil
  state.sigil = new Sigil({
    canvas: document.getElementById('sigil-canvas'),
    canvasSize: 200,
    drawDuration: 200,
    undrawDuration: 300,
    thinkingShiftInterval: 100,
    thinkingVariedMin: 1000,
    thinkingVariedMax: 3000,
    scale: 1.0,
    lineColor: '#fff',
    lineWeight: 1.2
  });
  
  // Start with "awaiting sigil..." and varied thinking mode
  const phraseElement = document.getElementById('sigil-phrase');
  typewrite(phraseElement, 'awaiting sigil...', 20);
  state.sigil.thinkingVaried();
  
  // Load default prompts
  loadDefaultPrompts();
  
  // Update UI
  updateUI();
  
  console.log('✅ Editor ready');
}

function loadDefaultPrompts() {
  document.getElementById('system-prompt').value = 
    `You are analyzing visual percepts from a webcam for UNI, an AI experiencing the world through sensors.

TASK: Create a sigil to represent what you see.

STEP 1: Create a "sigil phrase" - a punchy, poetic 2-4 word distillation of the moment.
STEP 2: Generate canvas drawing commands for a sigil representing that phrase.

Match the style from typical symbolic sigils. Balance geometric precision with organic fluidity.

RULES:
1. Available methods:
   - ctx.moveTo(x, y) - ALWAYS use this to start new separate elements
   - ctx.lineTo(x, y)
   - ctx.arc(x, y, radius, 0, Math.PI * 2)
   - ctx.quadraticCurveTo(cpx, cpy, x, y) - 4 parameters
   - ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y) - 6 parameters
   - ctx.beginPath(), ctx.closePath(), ctx.stroke()

2. PATH MANAGEMENT - CRITICAL:
   - Start with ONE ctx.beginPath() at the beginning
   - Use ctx.moveTo() before EVERY separate element to avoid connecting lines
   - End with ONE ctx.stroke() at the very end
   - Example: ctx.beginPath(); ctx.moveTo(50,20); ...lines...; ctx.moveTo(30,40); ...new element...; ctx.stroke();

3. MIX geometric and organic - use both straight lines AND curves
4. Sharp angles and clean lines give structure
5. Gentle curves add flow and warmth
6. STRONGLY FAVOR symmetry - create balanced, centered compositions
7. Small asymmetric details add character without breaking overall balance
8. AVOID explicit faces - no literal eyes, mouths, noses (subtle allusions OK)
9. Create abstract symbolic forms, not realistic depictions
10. Canvas is 100x100, center at (50, 50)
11. Maximum 30 lines
12. NO variables, NO functions, NO explanations
13. Output ONLY the ctx commands

Always respond with valid JSON in this exact format:
{
  "sigilPhrase": "2-4 word poetic distillation",
  "drawCalls": "ctx.beginPath();\\nctx.moveTo(50,20);\\n..."
}`;
  
  document.getElementById('user-prompt').value = 
    'Create a sigil for this moment.';
  
  updateCharCount('system-prompt', 'system-char-count');
  updateCharCount('user-prompt', 'user-char-count');
}

// Start application
init().catch(error => {
  console.error('Initialization failed:', error);
  showError('Failed to initialize: ' + error.message);
});

