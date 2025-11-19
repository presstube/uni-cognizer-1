// ============================================
// SECTION 1: State Management
// ============================================

// Application state
const state = {
  ws: null,               // Raw WebSocket connection
  stream: null,            // MediaStream from webcam
  videoElement: null,      // Video element reference
  currentPromptId: null,   // Database ID of loaded prompt
  isConnected: false,      // Session connection status
  responseBuffer: '',      // Accumulated response text
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
// SECTION 3: WebSocket Connection (Raw)
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
            responseModalities: ['TEXT']
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
    }
  }
}

// ============================================
// SECTION 4: UI Updates
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

// Clear response button
document.getElementById('clear-response-btn').addEventListener('click', () => {
  state.responseBuffer = '';
  updateResponseDisplay();
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

// ============================================
// SECTION 6: Initialization
// ============================================

async function init() {
  console.log('🚀 Initializing Visual Percept Prompt Editor');
  
  // Initialize webcam
  await initWebcam();
  
  // Load default prompts
  loadDefaultPrompts();
  
  // Update UI
  updateUI();
  
  console.log('✅ Editor ready');
}

function loadDefaultPrompts() {
  document.getElementById('system-prompt').value = 
    `You are analyzing visual percepts from a webcam for UNI, an AI experiencing the world through sensors.
Describe what you observe in a concise, poetic way.
Focus on: people, actions, emotions, objects, lighting, atmosphere.
Respond in 1-2 sentences.`;
  
  document.getElementById('user-prompt').value = 
    'What is happening in this moment?';
  
  updateCharCount('system-prompt', 'system-char-count');
  updateCharCount('user-prompt', 'user-char-count');
}

// Start application
init().catch(error => {
  console.error('Initialization failed:', error);
  showError('Failed to initialize: ' + error.message);
});

