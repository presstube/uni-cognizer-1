import 'dotenv/config';
import { cognize, onMindMoment, onSigil, onStateEvent, clearListeners, getHistory } from './real-cog.js';
import { CognitiveState } from './cognitive-states.js';
import { startDreamLoop, stopDreamLoop, isDreaming } from './dream-loop.js';

const DEPTH = 3;
const COGNITIVE_CYCLE_MS = parseInt(process.env.COGNITIVE_CYCLE_MS, 10) || 5000;
let cognitiveIntervalId = null;
let lastCycleStartTime = null;  // Track when the last cycle fired
let currentState = CognitiveState.IDLE;  // Track current cognitive state
let perceptQueue = {
  visualPercepts: [],
  audioPercepts: []
};

export function addPercept(percept) {
  if (percept.type === 'visual') {
    perceptQueue.visualPercepts.push(percept);
  } else if (percept.type === 'audio') {
    perceptQueue.audioPercepts.push(percept);
  }
}

function dumpPercepts() {
  const snapshot = {
    visualPercepts: [...perceptQueue.visualPercepts],
    audioPercepts: [...perceptQueue.audioPercepts]
  };
  
  perceptQueue.visualPercepts.length = 0;
  perceptQueue.audioPercepts.length = 0;
  
  return snapshot;
}

export function startCognitiveLoop(io) {
  if (cognitiveIntervalId) return;
  
  // Clear any lingering listeners from previous session
  clearListeners();
  
  // Mark the start of the first cycle
  lastCycleStartTime = Date.now();
  currentState = CognitiveState.AGGREGATING;
  
  cognitiveIntervalId = setInterval(async () => {
    lastCycleStartTime = Date.now();  // Update on each cycle
    const { visualPercepts, audioPercepts } = dumpPercepts();
    await cognize(visualPercepts, audioPercepts, DEPTH);
  }, COGNITIVE_CYCLE_MS);
  
  // Set up mind moment listener
  onMindMoment((cycle, mindMoment, visualPercepts, audioPercepts, priorMoments, sigilPhrase, kinetic, lighting) => {
    // Track state transition to VISUALIZING after mind moment
    currentState = CognitiveState.VISUALIZING;
    
    // Emit mind moment
    io.emit('mindMoment', {
      cycle,
      mindMoment,
      sigilPhrase,
      kinetic,
      lighting,
      visualPercepts,
      audioPercepts,
      priorMoments,
      timestamp: new Date().toISOString()
    });
    
    // Transition to VISUALIZING state
    io.emit('cognitiveState', { state: CognitiveState.VISUALIZING });
  });
  
  // Set up sigil listener
  onSigil((cycle, sigilCode, sigilPhrase, sigilSDF) => {
    // Emit sigil
    const sigilData = {
      cycle,
      sigilCode,
      sigilPhrase,
      timestamp: new Date().toISOString()
    };
    
    if (sigilSDF && sigilSDF.data) {
      sigilData.sdf = {
        width: sigilSDF.width,
        height: sigilSDF.height,
        data: Buffer.from(sigilSDF.data).toString('base64')
      };
    }
    
    io.emit('sigil', sigilData);
    
    // After sigil completes, if loop has stopped, emit state transition to IDLE
    if (!cognitiveIntervalId) {
      currentState = CognitiveState.IDLE;
      io.emit('cognitiveState', { state: CognitiveState.IDLE });
      console.log('💤 Transitioned to IDLE after in-flight operations');
    }
  });
  
  // Set up state event listener
  onStateEvent((eventType, data) => {
    // Track state changes
    if (eventType === 'cycleStarted') {
      currentState = CognitiveState.COGNIZING;
      io.emit('cognitiveState', { state: CognitiveState.COGNIZING });
      io.emit('cycleStarted', data);
    } else if (eventType === 'cycleCompleted') {
      // If loop stopped during cycle, transition to IDLE after completion
      if (!cognitiveIntervalId) {
        currentState = CognitiveState.IDLE;
        io.emit('cognitiveState', { state: CognitiveState.IDLE });
      } else {
        currentState = CognitiveState.AGGREGATING;
        io.emit('cognitiveState', { state: CognitiveState.AGGREGATING });
      }
      io.emit('cycleCompleted', data);
    } else if (eventType === 'cycleFailed') {
      currentState = CognitiveState.AGGREGATING;
      io.emit('cognitiveState', { state: CognitiveState.AGGREGATING });
      io.emit('cycleFailed', data);
    } else if (eventType === 'transitionToIdle') {
      currentState = CognitiveState.IDLE;
      io.emit('cognitiveState', { state: CognitiveState.IDLE });
      console.log('💤 Transitioned to IDLE after in-flight operations');
    } else if (eventType === 'sigilFailed') {
      io.emit('sigilFailed', data);
    }
  });
  
  console.log(`🧠 Cognitive loop started (${COGNITIVE_CYCLE_MS}ms cycle)`);
  process.stdout.write(`🧠 Cognitive loop ACTIVE - cycle every ${COGNITIVE_CYCLE_MS}ms\n`);
}

export function stopCognitiveLoop() {
  if (cognitiveIntervalId) {
    clearInterval(cognitiveIntervalId);
    cognitiveIntervalId = null;
    lastCycleStartTime = null;
    currentState = CognitiveState.IDLE;
    // DON'T clear listeners - let in-flight operations complete
    // Listeners will be cleared at start of next cognitive loop
    console.log('🛑 Cognitive loop stopped');
  }
}

/**
 * Get the current cognitive cycle status
 * Can be called anytime, regardless of session state
 * @returns {Object} Cycle status with timing info and current state
 */
export function getCycleStatus() {
  const isRunning = cognitiveIntervalId !== null;
  const dreaming = isDreaming();
  const now = Date.now();
  
  // If dreaming, return dream state
  if (dreaming) {
    return {
      isRunning: false,
      intervalMs: COGNITIVE_CYCLE_MS,
      nextCycleAt: null,
      msUntilNextCycle: null,
      state: CognitiveState.DREAMING
    };
  }
  
  if (!isRunning || !lastCycleStartTime) {
    return {
      isRunning: false,
      intervalMs: COGNITIVE_CYCLE_MS,
      nextCycleAt: null,
      msUntilNextCycle: null,
      state: CognitiveState.IDLE
    };
  }
  
  // Calculate when the next cycle will fire
  const elapsed = now - lastCycleStartTime;
  const msUntilNextCycle = Math.max(0, COGNITIVE_CYCLE_MS - elapsed);
  const nextCycleAt = now + msUntilNextCycle;
  
  return {
    isRunning: true,
    intervalMs: COGNITIVE_CYCLE_MS,
    nextCycleAt,
    msUntilNextCycle,
    state: currentState
  };
}

export { getHistory, startDreamLoop, stopDreamLoop, isDreaming };

