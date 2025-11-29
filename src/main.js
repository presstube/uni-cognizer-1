import 'dotenv/config';
import { cognize, onMindMoment, onSigil, onStateEvent, clearListeners, getHistory } from './real-cog.js';
import { CognitiveState } from './cognitive-states.js';

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

export function startCognitiveLoop(callback, sigilCallback, stateCallback) {
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
  
  if (callback) {
    onMindMoment((...args) => {
      // Track state transition to VISUALIZING after mind moment
      currentState = CognitiveState.VISUALIZING;
      // Forward to original callback
      callback(...args);
    });
  }
  
  if (sigilCallback) {
    onSigil((...args) => {
      // Forward to original callback
      sigilCallback(...args);
      
      // After sigil completes, if loop has stopped, emit state transition to IDLE
      if (!cognitiveIntervalId) {
        currentState = CognitiveState.IDLE;
        // Trigger a synthetic state event for IDLE transition
        if (stateCallback) {
          stateCallback('transitionToIdle', { 
            reason: 'cognitive loop stopped',
            timestamp: new Date().toISOString()
          });
        }
      }
    });
  }
  
  if (stateCallback) {
    onStateEvent((eventType, data) => {
      // Track state changes
      if (eventType === 'cycleStarted') {
        currentState = CognitiveState.COGNIZING;
      } else if (eventType === 'cycleCompleted' || eventType === 'cycleFailed') {
        // If loop stopped during cycle, transition to IDLE after completion
        if (!cognitiveIntervalId) {
          currentState = CognitiveState.IDLE;
          // Emit IDLE transition after forwarding current event
          setTimeout(() => {
            stateCallback('transitionToIdle', {
              reason: 'cognitive loop stopped',
              timestamp: new Date().toISOString()
            });
          }, 0);
        } else {
          currentState = CognitiveState.AGGREGATING;
        }
      }
      // Forward to original callback
      stateCallback(eventType, data);
    });
  }
  
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
  const now = Date.now();
  
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

export { getHistory };

