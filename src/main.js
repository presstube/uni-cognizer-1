import 'dotenv/config';
import { cognize, onMindMoment, getHistory } from './real-cog.js';

const DEPTH = 3;
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

export function startCognitiveLoop(callback) {
  if (cognitiveIntervalId) return;
  
  cognitiveIntervalId = setInterval(() => {
    const { visualPercepts, audioPercepts } = dumpPercepts();
    cognize(visualPercepts, audioPercepts, DEPTH);
  }, 5000);
  
  if (callback) {
    onMindMoment(callback);
  }
  
  console.log('🧠 Cognitive loop started');
}

export function stopCognitiveLoop() {
  if (cognitiveIntervalId) {
    clearInterval(cognitiveIntervalId);
    cognitiveIntervalId = null;
    console.log('🛑 Cognitive loop stopped');
  }
}

export { getHistory };

