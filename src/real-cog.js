import { callLLM, providerName } from './providers/index.js';
import { ROBOT_PERSONALITY } from './personality-uni-v2.js';
import { generateSigil } from './sigil/generator.js';
import { saveMindMoment as dbSaveMindMoment, getPriorMindMoments as dbGetPriorMindMoments } from './db/mind-moments.js';
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
  // Fallback to in-memory if database not enabled
  return Object.keys(cognitiveHistory)
    .map(Number)
    .sort((a, b) => b - a)
    .map(c => ({
      id: cognitiveHistory[c].id,
      cycle: c,
      mindMoment: cognitiveHistory[c].mindMoment,
      sigilPhrase: cognitiveHistory[c].sigilPhrase,
      sigilCode: cognitiveHistory[c].sigilCode
    }))
    .filter(m => m.mindMoment !== "awaiting")
    .slice(0, depth);
}

async function getPriorMindMomentsWithDB(depth) {
  if (process.env.DATABASE_ENABLED === 'true') {
    try {
      const dbPriors = await dbGetPriorMindMoments('uni', depth);
      return dbPriors.map(row => ({
        id: row.id,
        cycle: row.cycle,
        mindMoment: row.mind_moment,
        sigilPhrase: row.sigil_phrase,
        sigilCode: row.sigil_code
      }));
    } catch (error) {
      console.error('Failed to fetch prior moments from DB:', error.message);
      return getPriorMindMoments(depth); // Fallback to in-memory
    }
  }
  return getPriorMindMoments(depth);
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

function dispatchSigil(cycle, sigilCode, sigilPhrase, sigilPNG) {
  sigilListeners.forEach(listener => {
    listener(cycle, sigilCode, sigilPhrase, sigilPNG);
  });
}

export function clearListeners() {
  mindMomentListeners = [];
  sigilListeners = [];
  stateListeners = [];
}

export async function cognize(visualPercepts, audioPercepts, depth = 3) {
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
  
  const priorMoments = await getPriorMindMomentsWithDB(depth);
  
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
  process.stdout.write(`\n🔄 CYCLE ${thisCycle} STARTED (${activeVisual.length} visual, ${activeAudio.length} audio)\n`);
  
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
      
      // Percept PNGs are already generated (at arrival time)
      // No need to generate them here - they're already in the percept objects
      
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
      process.stdout.write(`\n✅ CYCLE ${thisCycle} COMPLETE - Mind: "${result.mindMoment.slice(0, 60)}..."\n`);
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
          const { sigilCode, sigilPromptId } = await generateSigil(result.sigilPhrase);
          
          // Generate PNG directly from canvas code
          let sigilPNG = null;
          try {
            const { canvasToPNG } = await import('./sigil/canvas-to-png.js');
            sigilPNG = await canvasToPNG(sigilCode, { 
              width: 512, 
              height: 512,
              canvasWidth: 100,
              canvasHeight: 100,
              strokeWidth: 1.0,
              scale: 1.0  // Full scale
            });
          } catch (pngError) {
            console.warn('⚠️  PNG generation failed:', pngError.message);
          }
          
          const sigilDuration = Date.now() - sigilStartTime;
          
          // Update history with PNG
          cognitiveHistory[thisCycle].sigilCode = sigilCode;
          if (sigilPNG) {
            cognitiveHistory[thisCycle].sigilPNG = sigilPNG;
          }
          
          // Update sigil data in database (with PNG if available)
          if (process.env.DATABASE_ENABLED === 'true' && cognitiveHistory[thisCycle].id) {
            try {
              const { getPool } = await import('./db/index.js');
              const pool = getPool();
              
              console.log(`💾 Updating sigil in database (ID: ${cognitiveHistory[thisCycle].id.substring(0, 8)}...)`);
              
              if (sigilPNG) {
                try {
                  await pool.query(
                    `UPDATE mind_moments 
                     SET sigil_code = $1,
                         sigil_png_data = $2,
                         sigil_png_width = $3,
                         sigil_png_height = $4,
                         sigil_prompt_id = $5
                     WHERE id = $6`,
                    [sigilCode, sigilPNG.data, sigilPNG.width, sigilPNG.height, sigilPromptId, cognitiveHistory[thisCycle].id]
                  );
                  console.log(`✓ Sigil saved to database (code + PNG)`);
                } catch (columnError) {
                  // PNG columns might not exist yet - fall back to just code
                  console.warn('⚠️  PNG columns not available, saving code only');
                  await pool.query(
                    'UPDATE mind_moments SET sigil_code = $1, sigil_prompt_id = $2 WHERE id = $3',
                    [sigilCode, sigilPromptId, cognitiveHistory[thisCycle].id]
                  );
                  console.log('✓ Sigil saved to database (code only)');
                }
              } else {
                // No PNG generated, just update sigil_code
                await pool.query(
                  'UPDATE mind_moments SET sigil_code = $1, sigil_prompt_id = $2 WHERE id = $3',
                  [sigilCode, sigilPromptId, cognitiveHistory[thisCycle].id]
                );
                console.log(`✓ Sigil saved to database (code only, no PNG)`);
              }
            } catch (dbError) {
              console.error('❌ Failed to update sigil in database:', dbError.message);
            }
          } else if (process.env.DATABASE_ENABLED === 'true') {
            console.warn('⚠️  Cannot save sigil to database: No moment ID (initial save may have failed)');
          }
          
          console.log(`✓ Sigil generated (${sigilDuration}ms)`);
          console.log(`  Code: ${sigilCode.length} chars`);
          if (sigilPNG) {
            console.log(`  PNG: ${sigilPNG.width}×${sigilPNG.height} (${sigilPNG.data.length} bytes)`);
          }
          console.log('');
          
          // Emit sigil event (include PNG if available)
          dispatchSigil(thisCycle, sigilCode, result.sigilPhrase, sigilPNG);
          
        } catch (sigilError) {
          console.error(`❌ Sigil generation failed:`, sigilError.message);
          cognitiveHistory[thisCycle].sigilCode = null;
          cognitiveHistory[thisCycle].sigilPNG = null;
          
          // Store error in database for diagnostics
          if (process.env.DATABASE_ENABLED === 'true' && cognitiveHistory[thisCycle].id) {
            try {
              const { getPool } = await import('./db/index.js');
              const pool = getPool();
              await pool.query(
                'UPDATE mind_moments SET sigil_generation_error = $1 WHERE id = $2',
                [sigilError.message, cognitiveHistory[thisCycle].id]
              );
              console.log(`💾 Sigil error logged to database`);
            } catch (dbError) {
              console.error('Failed to log sigil error:', dbError.message);
            }
          }
          
          // Emit sigil failed event
          dispatchStateEvent('sigilFailed', {
            cycle: thisCycle,
            error: sigilError.message,
            sigilPhrase: result.sigilPhrase
          });
        }
      } else {
        cognitiveHistory[thisCycle].sigilCode = null;
        // cognitiveHistory[thisCycle].sigilSVG = null; // Commented out - not generating SVG
        cognitiveHistory[thisCycle].sigilSDF = null;
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

