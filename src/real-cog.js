import { callLLM } from './providers/index.js';
import { ROBOT_PERSONALITY } from './personality-unisphere.js';

const cognitiveHistory = {};
let cycleIndex = 0;
let mindMomentListeners = [];

async function realLLMCall(visualPercepts, audioPercepts, priorMoments) {
  const activeVisual = visualPercepts.filter(p => p.action !== "NOPE");
  const activeAudio = audioPercepts.filter(p => p.transcript || (p.analysis !== "Silence" && p.analysis !== "Silence - visitor observing quietly"));
  
  const visualStr = activeVisual.map(p => `${p.emoji} ${p.action}`).join('; ') || '(none)';
  const audioStr = activeAudio.map(p => {
    if (p.transcript) return `"${p.transcript}"`;
    return p.analysis;
  }).join('; ') || '(none)';
  
  const contextStr = priorMoments.length > 0 
    ? `\nRECENT CONTEXT:\n${priorMoments.map((m, i) => `${i+1} cycles ago: "${m.mindMoment}"`).join('\n')}`
    : '';
  
  const prompt = `${ROBOT_PERSONALITY}

CURRENT PERCEPTS:
Visual: ${visualStr}
Audio: ${audioStr}
${contextStr}

Generate a single "mind moment" - one clear thought/observation from UNI's perspective right now. Be specific about what you notice. Reference building systems when relevant. Stay grounded.

Respond with ONLY the mind moment text (1-2 sentences max), nothing else.`;

  const response = await callLLM(prompt);
  return response.trim();
}

function timestamp() {
  return new Date().toLocaleTimeString('en-US', { 
    hour12: false, 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit',
    fractionalSecondDigits: 3
  });
}

function getPriorMindMoments(depth) {
  return Object.keys(cognitiveHistory)
    .map(Number)
    .sort((a, b) => b - a)
    .map(c => ({
      cycle: c,
      mindMoment: cognitiveHistory[c].mindMoment
    }))
    .filter(m => m.mindMoment !== "awaiting")
    .slice(0, depth);
}

function dispatchMindMoment(cycle, mindMoment, visualPercepts, audioPercepts, priorMoments) {
  mindMomentListeners.forEach(listener => {
    listener(cycle, mindMoment, visualPercepts, audioPercepts, priorMoments);
  });
}

export function onMindMoment(listener) {
  mindMomentListeners.push(listener);
}

export function cognize(visualPercepts, audioPercepts, depth = 3) {
  const thisCycle = ++cycleIndex;
  
  cognitiveHistory[thisCycle] = {
    visualPercepts,
    audioPercepts,
    mindMoment: "awaiting"
  };
  
  const priorMoments = getPriorMindMoments(depth);
  
  console.log(`${'═'.repeat(50)}`);
  console.log(`[${timestamp()}] CYCLE ${thisCycle} SENT (depth: ${priorMoments.length})`);
  console.log(`${'═'.repeat(50)}`);
  
  const activeVisual = visualPercepts.filter(p => p.action !== "NOPE");
  const activeAudio = audioPercepts.filter(p => p.transcript || (p.analysis !== "Silence" && p.analysis !== "Silence - visitor observing quietly"));
  
  console.log(`Visual: ${activeVisual.length} percepts`);
  activeVisual.forEach(p => {
    console.log(`   ${p.emoji} ${p.action}`);
  });
  
  console.log(`Audio: ${activeAudio.length} percepts`);
  activeAudio.forEach(p => {
    if (p.transcript) {
      console.log(`   ${p.emoji} "${p.transcript.slice(0, 50)}..."`);
    } else {
      console.log(`   ${p.emoji} ${p.analysis}`);
    }
  });
  
  if (priorMoments.length > 0) {
    console.log(`Prior Context (${priorMoments.length} moments):`);
    priorMoments.forEach((m, i) => {
      console.log(`   ${i + 1} cycles ago: "${m.mindMoment}"`);
    });
  }
  console.log('');
  
  realLLMCall(visualPercepts, audioPercepts, priorMoments)
    .then(mindMoment => {
      cognitiveHistory[thisCycle].mindMoment = mindMoment;
      
      console.log(`${'═'.repeat(50)}`);
      console.log(`[${timestamp()}] CYCLE ${thisCycle} RECEIVED`);
      console.log(`${'═'.repeat(50)}`);
      console.log(`Mind Moment:`);
      console.log(`   ${mindMoment}`);
      console.log(`Context Depth: ${priorMoments.length}`);
      console.log('');
      
      dispatchMindMoment(thisCycle, mindMoment, visualPercepts, audioPercepts, priorMoments);
    })
    .catch(err => {
      console.error(`\n❌ ERROR in Cycle ${thisCycle}:`, err.message);
      cognitiveHistory[thisCycle].mindMoment = `[error: ${err.message}]`;
    });
}

export function getHistory() {
  return cognitiveHistory;
}

