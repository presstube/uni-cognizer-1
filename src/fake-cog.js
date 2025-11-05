const cognitiveHistory = {};
let cycleIndex = 0;
let mindMomentListeners = [];

function mockLLMCall(visualPercepts, audioPercepts, priorMoments) {
  const latency = 6000 + Math.random() * 2000;
  return new Promise((resolve) => {
    setTimeout(() => {
      const vCount = visualPercepts.filter(p => p.action !== "NOPE").length;
      const aCount = audioPercepts.filter(p => p.transcript || (p.analysis !== "Silence" && p.analysis !== "Silence - visitor observing quietly")).length;
      const moment = `Mind sensing ${vCount}v/${aCount}a with context depth ${priorMoments.length}`;
      resolve(moment);
    }, latency);
  });
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
  
  mockLLMCall(visualPercepts, audioPercepts, priorMoments).then(mindMoment => {
    cognitiveHistory[thisCycle].mindMoment = mindMoment;
    
    console.log(`${'═'.repeat(50)}`);
    console.log(`[${timestamp()}] CYCLE ${thisCycle} RECEIVED`);
    console.log(`${'═'.repeat(50)}`);
    console.log(`Mind Moment:`);
    console.log(`   ${mindMoment}`);
    console.log(`Context Depth: ${priorMoments.length}`);
    console.log('');
    
    dispatchMindMoment(thisCycle, mindMoment, visualPercepts, audioPercepts, priorMoments);
  });
}

export function getHistory() {
  return cognitiveHistory;
}

