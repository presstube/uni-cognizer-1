import { callLLM, providerName } from './providers/index.js';
import { ROBOT_PERSONALITY } from './personality-uni-v2.js';
import { generateSigil } from './sigil/generator.js';
import { saveMindMoment as dbSaveMindMoment } from './db/mind-moments.js';
import { getActivePersonality } from './db/personalities.js';
import { COGNIZER_VERSION } from './version.js';

const cognitiveHistory = {};
let cycleIndex = 0;
let mindMomentListeners = [];
let sigilListeners = [];
let stateListeners = [];

// Personality management
let currentPersonality = ROBOT_PERSONALITY; // Fallback default
let currentPersonalityId = null;
let currentPersonalityName = null;

// Initialize cycleIndex from database to maintain UNI's continuous consciousness
export async function initializeCycleIndex() {
  if (process.env.DATABASE_ENABLED === 'true') {
    try {
      const { getPool } = await import('./db/index.js');
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

// Initialize personality from database
export async function initializePersonality() {
  if (process.env.DATABASE_ENABLED === 'true') {
    try {
      const active = await getActivePersonality();
      if (active) {
        currentPersonality = active.prompt;
        currentPersonalityId = active.id;
        currentPersonalityName = active.name;
        console.log(`🎭 Loaded personality: ${active.name} (${active.slug})`);
      } else {
        console.log('🎭 No active personality in database, using default');
      }
    } catch (error) {
      console.error('Failed to load personality from database:', error.message);
      console.log('🎭 Using default hardcoded personality');
    }
  } else {
    console.log('🎭 Using default hardcoded personality');
  }
}

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
  
  const prompt = `${currentPersonality}

CURRENT PERCEPTS:
Visual: ${visualStr}
Audio: ${audioStr}
${contextStr}

Generate a complete cognitive response as JSON. Be specific about what you notice. Reference building systems when relevant. Stay grounded.

Respond with ONLY valid JSON, nothing else.`;

  const response = await callLLM(prompt);
  const text = response.trim();
  
  // Try to parse as JSON first
  try {
    // Remove markdown code blocks if present
    let jsonText = text;
    if (text.includes('```json')) {
      jsonText = text.match(/```json\s*([\s\S]*?)\s*```/)?.[1] || text;
    } else if (text.includes('```')) {
      jsonText = text.match(/```\s*([\s\S]*?)\s*```/)?.[1] || text;
    }
    
    const parsed = JSON.parse(jsonText.trim());
    
    return {
      mindMoment: parsed.mindMoment || parsed.mind_moment || '',
      sigilPhrase: parsed.sigilPhrase || parsed.sigil_phrase || null,
      kinetic: parsed.kinetic || { pattern: 'IDLE' },
      lighting: parsed.lighting || { color: '0xffffff', pattern: 'IDLE', speed: 0 }
    };
  } catch (error) {
    // Fallback to old text parsing format
    console.warn('[Cognition] Failed to parse JSON, falling back to text parsing:', error.message);
    const mindMomentMatch = text.match(/MIND MOMENT:\s*(.+?)(?=\n\nSIGIL PHRASE:|$)/s);
    const sigilPhraseMatch = text.match(/SIGIL PHRASE:\s*(.+?)$/s);
    
    return {
      mindMoment: mindMomentMatch ? mindMomentMatch[1].trim() : text,
      sigilPhrase: sigilPhraseMatch ? sigilPhraseMatch[1].trim() : null,
      kinetic: { pattern: 'IDLE' },
      lighting: { color: '0xffffff', pattern: 'IDLE', speed: 0 }
    };
  }
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

function dispatchStateEvent(eventType, data) {
  stateListeners.forEach(listener => {
    listener(eventType, data);
  });
}

export function onMindMoment(listener) {
  mindMomentListeners.push(listener);
}

export function onStateEvent(listener) {
  stateListeners.push(listener);
}

export function onSigil(listener) {
  sigilListeners.push(listener);
}

function dispatchSigil(cycle, sigilCode, sigilPhrase) {
  sigilListeners.forEach(listener => {
    listener(cycle, sigilCode, sigilPhrase);
  });
}

export function clearListeners() {
  mindMomentListeners = [];
  sigilListeners = [];
  stateListeners = [];
}

export function cognize(visualPercepts, audioPercepts, depth = 3) {
  const thisCycle = ++cycleIndex;
  const startTime = Date.now();
  
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
  
  realLLMCall(visualPercepts, audioPercepts, priorMoments)
    .then(async result => {
      const mindMomentDuration = Date.now() - startTime;
      
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
          personalityId: currentPersonalityId,
          llmProvider: providerName,
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
      if (result.sigilPhrase) {
        console.log(`Sigil Phrase:`);
        console.log(`   "${result.sigilPhrase}"`);
      }
      console.log(`Kinetic: ${result.kinetic.pattern}`);
      console.log(`Lighting: ${result.lighting.color} ${result.lighting.pattern} (speed: ${result.lighting.speed})`);
      console.log(`Context Depth: ${priorMoments.length}`);
      console.log(`Duration: ${mindMomentDuration}ms`);
      console.log('');
      
      // Emit mind moment event (early notification)
      dispatchMindMoment(thisCycle, result.mindMoment, visualPercepts, audioPercepts, priorMoments, result.sigilPhrase, result.kinetic, result.lighting);
      
      // STEP 2: Generate sigil if we have a phrase
      if (result.sigilPhrase) {
        console.log(`🎨 Generating sigil for: "${result.sigilPhrase}"`);
        const sigilStartTime = Date.now();
        
        try {
          const sigilCode = await generateSigil(result.sigilPhrase);
          const sigilDuration = Date.now() - sigilStartTime;
          
          // Update history with sigil code
          cognitiveHistory[thisCycle].sigilCode = sigilCode;
          
          // Update sigil code in database
          if (process.env.DATABASE_ENABLED === 'true' && cognitiveHistory[thisCycle].id) {
            try {
              const { getPool } = await import('./db/index.js');
              const pool = getPool();
              await pool.query(
                'UPDATE mind_moments SET sigil_code = $1 WHERE id = $2',
                [sigilCode, cognitiveHistory[thisCycle].id]
              );
            } catch (dbError) {
              console.error('Failed to update sigil in database:', dbError.message);
            }
          }
          
          console.log(`✓ Sigil generated (${sigilDuration}ms)`);
          console.log(`  Code length: ${sigilCode.length} chars`);
          console.log('');
          
          // Emit sigil event
          dispatchSigil(thisCycle, sigilCode, result.sigilPhrase);
          
        } catch (sigilError) {
          console.error(`❌ Sigil generation failed:`, sigilError.message);
          cognitiveHistory[thisCycle].sigilCode = null;
          
          // Emit sigil failed event
          dispatchStateEvent('sigilFailed', {
            cycle: thisCycle,
            error: sigilError.message,
            sigilPhrase: result.sigilPhrase
          });
        }
      } else {
        cognitiveHistory[thisCycle].sigilCode = null;
      }
      
      const totalDuration = Date.now() - startTime;
      
      // Emit cycle completed with full data
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
      
      console.log(`${'═'.repeat(50)}`);
      console.log(`[${timestamp()}] CYCLE ${thisCycle} COMPLETE`);
      console.log(`Total Duration: ${totalDuration}ms`);
      console.log(`${'═'.repeat(50)}\n`);
    })
    .catch(err => {
      const duration = Date.now() - startTime;
      
      console.error(`\n❌ ERROR in Cycle ${thisCycle}:`, err.message);
      cognitiveHistory[thisCycle].mindMoment = `[error: ${err.message}]`;
      cognitiveHistory[thisCycle].sigilPhrase = null;
      cognitiveHistory[thisCycle].kinetic = { pattern: 'IDLE' };
      cognitiveHistory[thisCycle].lighting = { color: '0xff0000', pattern: 'HECTIC_NOISE', speed: 1 };
      cognitiveHistory[thisCycle].sigilCode = null;
      
      // Emit cycle failed event
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

