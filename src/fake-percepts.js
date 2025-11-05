import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const visualPerceptsPath = join(__dirname, '../data/mock-visual-percepts-visitor.json');
const audioPerceptsPath = join(__dirname, '../data/mock-audio-percepts-detailed.json');

const VISUAL_PERCEPTS = JSON.parse(readFileSync(visualPerceptsPath, 'utf-8'));
const AUDIO_PERCEPTS = JSON.parse(readFileSync(audioPerceptsPath, 'utf-8'));

const visualPerceptsArr = [];
const audioPerceptsArr = [];

function weightedRandom(items) {
  const totalWeight = items.reduce((sum, p) => sum + p.weight, 0);
  let random = Math.random() * totalWeight;
  
  for (const item of items) {
    random -= item.weight;
    if (random <= 0) return item;
  }
  return items[0];
}

function generateVisual() {
  const selected = weightedRandom(VISUAL_PERCEPTS);
  return {
    timestamp: new Date().toISOString(),
    type: 'visual',
    action: selected.action,
    emoji: selected.emoji
  };
}

function generateAudio() {
  const selected = weightedRandom(AUDIO_PERCEPTS);
  return {
    timestamp: new Date().toISOString(),
    type: 'audio',
    transcript: selected.transcript || null,
    analysis: selected.analysis,
    tone: selected.tone,
    emoji: selected.emoji,
    sentiment: selected.sentiment,
    confidence: selected.confidence
  };
}

function formatTimestamp() {
  return new Date().toLocaleTimeString('en-US', { 
    hour12: false, 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit',
    fractionalSecondDigits: 3
  });
}

setInterval(() => {
  const percept = generateVisual();
  visualPerceptsArr.push(percept);
  
  if (percept.action !== "NOPE") {
    console.log(`${'═'.repeat(50)}`);
    console.log(`[${formatTimestamp()}] 👁️  ${percept.emoji} ${percept.action}`);
    console.log(`${'═'.repeat(50)}\n`);
  }
}, 3000);

function scheduleNextAudio() {
  const delay = 7000 + Math.random() * 3000;
  setTimeout(() => {
    const percept = generateAudio();
    audioPerceptsArr.push(percept);
    
    if (percept.transcript) {
      console.log(`${'═'.repeat(50)}`);
      console.log(`[${formatTimestamp()}] 🎤 ${percept.emoji} "${percept.transcript.slice(0, 60)}${percept.transcript.length > 60 ? '...' : ''}"`);
      console.log(`${'═'.repeat(50)}\n`);
    } else if (percept.analysis !== "Silence" && percept.analysis !== "Silence - visitor observing quietly") {
      console.log(`${'═'.repeat(50)}`);
      console.log(`[${formatTimestamp()}] 🎤 ${percept.emoji} ${percept.analysis}`);
      console.log(`${'═'.repeat(50)}\n`);
    }
    
    scheduleNextAudio();
  }, delay);
}
scheduleNextAudio();

export function dumpPercepts() {
  const snapshot = {
    visualPercepts: [...visualPerceptsArr],
    audioPercepts: [...audioPerceptsArr]
  };
  
  visualPerceptsArr.length = 0;
  audioPerceptsArr.length = 0;
  
  return snapshot;
}

