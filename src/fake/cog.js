import { saveMindMoment as dbSaveMindMoment } from '../db/mind-moments.js';
import { COGNIZER_VERSION } from '../version.js';

const cognitiveHistory = {};
let cycleIndex = 0;
let mindMomentListeners = [];
let sigilListeners = [];
let stateListeners = [];

// Initialize cycleIndex from database to maintain UNI's continuous consciousness
export async function initializeCycleIndex() {
  if (process.env.DATABASE_ENABLED === 'true') {
    try {
      const { getPool } = await import('../db/index.js');
      const pool = getPool();
      const result = await pool.query(
        "SELECT MAX(cycle) as max_cycle FROM mind_moments WHERE session_id = 'uni'"
      );
      cycleIndex = result.rows[0].max_cycle || 0;
      console.log(`🧠 UNI's consciousness resuming from cycle ${cycleIndex}`);
    } catch (error) {
      console.error('Failed to initialize cycle index from database:', error.message);
      console.log('🧠 Starting UNI from cycle 0');
    }
  }
}

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

function dispatchSigil(cycle, sigilCode, sigilPhrase, sigilSDF) {
  sigilListeners.forEach(listener => {
    listener(cycle, sigilCode, sigilPhrase, sigilSDF);
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
  stateListeners = [];
}

function dispatchStateEvent(eventType, data) {
  stateListeners.forEach(listener => {
    listener(eventType, data);
  });
}

export function onStateEvent(listener) {
  stateListeners.push(listener);
}

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
  
  const activeVisual = visualPercepts.filter(p => p.action !== "NOPE");
  const activeAudio = audioPercepts.filter(p => p.transcript || (p.analysis !== "Silence" && p.analysis !== "Silence - visitor observing quietly"));
  
  // Emit cycle started event
  dispatchStateEvent('cycleStarted', {
    cycle: thisCycle,
    visualPercepts: activeVisual.length,
    audioPercepts: activeAudio.length,
    priorMoments: priorMoments.length,
    timestamp: new Date().toISOString()
  });
  
  console.log(`${'═'.repeat(50)}`);
  console.log(`[${timestamp()}] CYCLE ${thisCycle} SENT (depth: ${priorMoments.length})`);
  console.log(`${'═'.repeat(50)}`);
  
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
  
  const cycleStartTime = Date.now();
  mockLLMCall(visualPercepts, audioPercepts, priorMoments).then(async result => {
    const mindMomentDuration = Date.now() - cycleStartTime;
    
    cognitiveHistory[thisCycle].mindMoment = result.mindMoment;
    cognitiveHistory[thisCycle].sigilPhrase = result.sigilPhrase;
    cognitiveHistory[thisCycle].kinetic = result.kinetic;
    cognitiveHistory[thisCycle].lighting = result.lighting;
    
    // Save to database
    if (process.env.DATABASE_ENABLED === 'true') {
      try {
        const priorIds = priorMoments.map(m => m.id).filter(Boolean);
        
        const saved = await dbSaveMindMoment({
          cycle: thisCycle,
          sessionId: 'uni', // UNI's singular continuous mind
          mindMoment: result.mindMoment,
          sigilPhrase: result.sigilPhrase,
          sigilCode: null, // Not yet generated
          kinetic: result.kinetic,
          lighting: result.lighting,
          visualPercepts,
          audioPercepts,
          priorMomentIds: priorIds,
          cognizerVersion: COGNIZER_VERSION,
          llmProvider: 'mock',
          processingDuration: mindMomentDuration
        });
        
        // Store DB ID in history
        cognitiveHistory[thisCycle].id = saved.id;
        
        console.log(`💾 Saved to database (ID: ${saved.id.substring(0, 8)}...)`);
      } catch (error) {
        console.error('Failed to save to database:', error.message);
        // Continue without DB save
      }
    }
    
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
      
      // Generate SDF from mock sigil code
      let sigilSDF = null;
      try {
        const { canvasToSDF } = await import('../sigil/canvas-to-sdf.js');
        sigilSDF = await canvasToSDF(sigilCode, { 
          width: 256, 
          height: 256,
          canvasWidth: 100,
          canvasHeight: 100,
          strokeWidth: 2,
          scale: 0.75  // Scale down to prevent gradient cutoff
        });
        cognitiveHistory[thisCycle].sigilSDF = sigilSDF;
      } catch (sdfError) {
        console.warn('⚠️  Mock SDF generation failed:', sdfError.message);
      }
      
      // Update sigil code and SDF in database
      if (process.env.DATABASE_ENABLED === 'true' && cognitiveHistory[thisCycle].id) {
        try {
          const { getPool } = await import('../db/index.js');
          const pool = getPool();
          
          if (sigilSDF) {
            try {
              await pool.query(
                `UPDATE mind_moments 
                 SET sigil_code = $1,
                     sigil_sdf_data = $2,
                     sigil_sdf_width = $3,
                     sigil_sdf_height = $4
                 WHERE id = $5`,
                [sigilCode, sigilSDF.data, sigilSDF.width, sigilSDF.height, cognitiveHistory[thisCycle].id]
              );
            } catch (columnError) {
              // Columns might not exist yet - fall back to just code
              await pool.query(
                'UPDATE mind_moments SET sigil_code = $1 WHERE id = $2',
                [sigilCode, cognitiveHistory[thisCycle].id]
              );
            }
          } else {
            await pool.query(
              'UPDATE mind_moments SET sigil_code = $1 WHERE id = $2',
              [sigilCode, cognitiveHistory[thisCycle].id]
            );
          }
        } catch (dbError) {
          console.error('Failed to update sigil in database:', dbError.message);
        }
      }
      
      console.log(`✓ Mock sigil generated`);
      console.log(`  Code length: ${sigilCode.length} chars`);
      if (sigilSDF) {
        console.log(`  SDF: ${sigilSDF.width}×${sigilSDF.height} (${sigilSDF.data.length} bytes)`);
      }
      console.log('');
      
      // Emit sigil event (include SDF if available)
      dispatchSigil(thisCycle, sigilCode, result.sigilPhrase, sigilSDF);
    } else {
      cognitiveHistory[thisCycle].sigilCode = null;
      cognitiveHistory[thisCycle].sigilSDF = null;
    }
    
    const totalDuration = Date.now() - cycleStartTime;
    
    // Emit cycle completed event
    dispatchStateEvent('cycleCompleted', {
      cycle: thisCycle,
      mindMoment: result.mindMoment,
      sigilPhrase: result.sigilPhrase,
      kinetic: result.kinetic,
      lighting: result.lighting,
      sigilCode: cognitiveHistory[thisCycle].sigilCode,
      duration: totalDuration,
      timestamp: new Date().toISOString()
    });
  })
  .catch(err => {
    const duration = Date.now() - cycleStartTime;
    dispatchStateEvent('cycleFailed', {
      cycle: thisCycle,
      error: err.message,
      duration,
      timestamp: new Date().toISOString()
    });
  });
}

export function getHistory() {
  return cognitiveHistory;
}

