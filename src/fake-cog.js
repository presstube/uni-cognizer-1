const cognitiveHistory = {};
let cycleIndex = 0;

function mockLLMCall() {
  const latency = 6000 + Math.random() * 2000;
  return new Promise((resolve) => {
    setTimeout(() => resolve("an emotional plan"), latency);
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

export function cognize(visualPercepts, audioPercepts) {
  const thisCycle = ++cycleIndex;
  
  cognitiveHistory[thisCycle] = {
    visualPercepts,
    audioPercepts,
    emotionalPlan: "awaiting"
  };
  
  console.log(`\n[${timestamp()}] 📤 Cycle ${thisCycle} → LLM`);
  console.log(`   Visual: ${visualPercepts.length} percepts`);
  visualPercepts.filter(p => p.action !== "NOPE").forEach(p => {
    console.log(`      ${p.emoji} ${p.action}`);
  });
  console.log(`   Audio: ${audioPercepts.length} percepts`);
  audioPercepts.filter(p => p.transcript || (p.analysis !== "Silence" && p.analysis !== "Silence - visitor observing quietly")).forEach(p => {
    if (p.transcript) {
      console.log(`      ${p.emoji} "${p.transcript.slice(0, 50)}..."`);
    } else {
      console.log(`      ${p.emoji} ${p.analysis}`);
    }
  });
  
  mockLLMCall().then(emotionalPlan => {
    cognitiveHistory[thisCycle].emotionalPlan = emotionalPlan;
    
    console.log(`\n[${timestamp()}] 📥 Cycle ${thisCycle} ← LLM`);
    console.log(`${'═'.repeat(50)}`);
    console.log(`CYCLE ${thisCycle} RESPONSE`);
    console.log(`${'═'.repeat(50)}`);
    console.log(`Visual Percepts Processed:`);
    const activeVisual = visualPercepts.filter(p => p.action !== "NOPE");
    if (activeVisual.length === 0) {
      console.log(`   (none)`);
    } else {
      activeVisual.forEach(p => console.log(`   ${p.emoji} ${p.action}`));
    }
    console.log(`Audio Percepts Processed:`);
    const activeAudio = audioPercepts.filter(p => p.transcript || (p.analysis !== "Silence" && p.analysis !== "Silence - visitor observing quietly"));
    if (activeAudio.length === 0) {
      console.log(`   (none)`);
    } else {
      activeAudio.forEach(p => {
        if (p.transcript) {
          console.log(`   ${p.emoji} "${p.transcript.slice(0, 50)}..."`);
        } else {
          console.log(`   ${p.emoji} ${p.analysis}`);
        }
      });
    }
    console.log(`Emotional Plan:`);
    console.log(`   ${emotionalPlan}`);
    console.log(`${'═'.repeat(50)}\n`);
  });
}

export function getHistory() {
  return cognitiveHistory;
}

