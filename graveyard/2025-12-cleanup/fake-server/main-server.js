import 'dotenv/config';
import { cognize, onMindMoment, onSigil, onStateEvent, clearListeners, getHistory, initializeCycleIndex } from './cog.js';
import { CognitiveState } from '../cognitive-states.js';

const DEPTH = 3;
const COGNITIVE_CYCLE_MS = process.env.COGNITIVE_CYCLE_MS || 5000;
let cognitiveIntervalId = null;
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
  
  if (callback) {
    onMindMoment(callback);
  }
  
  if (sigilCallback) {
    onSigil(sigilCallback);
  }
  
  if (stateCallback) {
    onStateEvent(stateCallback);
  }
  
  cognitiveIntervalId = setInterval(() => {
    const { visualPercepts, audioPercepts } = dumpPercepts();
    cognize(visualPercepts, audioPercepts, DEPTH);
  }, COGNITIVE_CYCLE_MS);
  
  console.log(`🧠 Fake cognitive loop started (${COGNITIVE_CYCLE_MS}ms cycle)`);
}

export function stopCognitiveLoop() {
  if (cognitiveIntervalId) {
    clearInterval(cognitiveIntervalId);
    cognitiveIntervalId = null;
    clearListeners();
    console.log('🛑 Fake cognitive loop stopped');
  }
}

export { getHistory, initializeCycleIndex };

