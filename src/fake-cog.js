const cognitiveHistory = {};
let cycleIndex = 0;
let mindMomentListeners = [];
let sigilListeners = [];

function mockLLMCall(visualPercepts, audioPercepts, priorMoments) {
  const latency = 6000 + Math.random() * 2000;
  return new Promise((resolve) => {
    setTimeout(() => {
      const vCount = visualPercepts.filter(p => p.action !== "NOPE").length;
      const aCount = audioPercepts.filter(p => p.transcript || (p.analysis !== "Silence" && p.analysis !== "Silence - visitor observing quietly")).length;
      const mindMoment = `Mind sensing ${vCount}v/${aCount}a with context depth ${priorMoments.length}`;
      const sigilPhrase = `${vCount}v + ${aCount}a → depth ${priorMoments.length}`;
      
      // Random kinetic patterns
      const kineticPatterns = ['IDLE', 'HAPPY_BOUNCE', 'SLOW_SWAY', 'JIGGLE'];
      const kinetic = { pattern: kineticPatterns[Math.floor(Math.random() * kineticPatterns.length)] };
      
      // Random lighting
      const lightingPatterns = ['IDLE', 'SMOOTH_WAVES', 'CIRCULAR_PULSE', 'HECTIC_NOISE'];
      const colors = ['0xff0000', '0x00ff00', '0x0000ff', '0xff00ff', '0x00ffff', '0xffff00', '0xffffff'];
      const lighting = {
        color: colors[Math.floor(Math.random() * colors.length)],
        pattern: lightingPatterns[Math.floor(Math.random() * lightingPatterns.length)],
        speed: Math.random() * 2 - 1 // Random between -1 and 1
      };
      
      resolve({ mindMoment, sigilPhrase, kinetic, lighting });
    }, latency);
  });
}

function mockSigilGeneration() {
  const latency = 2000 + Math.random() * 1000;
  return new Promise((resolve) => {
    setTimeout(() => {
      const mockCode = `ctx.beginPath();\nctx.moveTo(50, 20);\nctx.lineTo(80, 80);\nctx.lineTo(20, 80);\nctx.closePath();\nctx.stroke();`;
      resolve(mockCode);
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

function dispatchMindMoment(cycle, mindMoment, visualPercepts, audioPercepts, priorMoments, sigilPhrase, kinetic, lighting) {
  mindMomentListeners.forEach(listener => {
    listener(cycle, mindMoment, visualPercepts, audioPercepts, priorMoments, sigilPhrase, kinetic, lighting);
  });
}

function dispatchSigil(cycle, sigilCode, sigilPhrase) {
  sigilListeners.forEach(listener => {
    listener(cycle, sigilCode, sigilPhrase);
  });
}

export function onMindMoment(listener) {
  mindMomentListeners.push(listener);
}

export function onSigil(listener) {
  sigilListeners.push(listener);
}

export function clearListeners() {
  mindMomentListeners = [];
  sigilListeners = [];
}

// Stub for fake-cog (not needed but exported for compatibility)
export function onStateEvent() {}

export function cognize(visualPercepts, audioPercepts, depth = 3) {
  const thisCycle = ++cycleIndex;
  
  cognitiveHistory[thisCycle] = {
    visualPercepts,
    audioPercepts,
    mindMoment: "awaiting",
    sigilPhrase: "awaiting",
    kinetic: "awaiting",
    lighting: "awaiting",
    sigilCode: "awaiting"
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
  
  mockLLMCall(visualPercepts, audioPercepts, priorMoments).then(async result => {
    cognitiveHistory[thisCycle].mindMoment = result.mindMoment;
    cognitiveHistory[thisCycle].sigilPhrase = result.sigilPhrase;
    cognitiveHistory[thisCycle].kinetic = result.kinetic;
    cognitiveHistory[thisCycle].lighting = result.lighting;
    
    console.log(`${'═'.repeat(50)}`);
    console.log(`[${timestamp()}] CYCLE ${thisCycle} RECEIVED`);
    console.log(`${'═'.repeat(50)}`);
    console.log(`Mind Moment:`);
    console.log(`   ${result.mindMoment}`);
    console.log(`Sigil Phrase:`);
    console.log(`   "${result.sigilPhrase}"`);
    console.log(`Kinetic: ${result.kinetic.pattern}`);
    console.log(`Lighting: ${result.lighting.color} ${result.lighting.pattern} (speed: ${result.lighting.speed.toFixed(2)})`);
    console.log(`Context Depth: ${priorMoments.length}`);
    console.log('');
    
    // Emit mind moment event (early notification)
    dispatchMindMoment(thisCycle, result.mindMoment, visualPercepts, audioPercepts, priorMoments, result.sigilPhrase, result.kinetic, result.lighting);
    
    // Generate mock sigil
    if (result.sigilPhrase) {
      console.log(`🎨 Generating mock sigil for: "${result.sigilPhrase}"`);
      
      const sigilCode = await mockSigilGeneration();
      cognitiveHistory[thisCycle].sigilCode = sigilCode;
      
      console.log(`✓ Mock sigil generated`);
      console.log(`  Code length: ${sigilCode.length} chars`);
      console.log('');
      
      // Emit sigil event
      dispatchSigil(thisCycle, sigilCode, result.sigilPhrase);
    } else {
      cognitiveHistory[thisCycle].sigilCode = null;
    }
  });
}

export function getHistory() {
  return cognitiveHistory;
}

