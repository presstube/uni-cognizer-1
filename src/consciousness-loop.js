/**
 * Unified Consciousness Loop
 * 
 * ONE consciousness with TWO modes:
 * - LIVE: Generate mind moments from new percepts (LLM)
 * - DREAM: Replay mind moments from memory (DB query)
 * 
 * Both modes produce identical output structure and broadcast identically.
 */

import { ConsciousnessMode, Phase, PhaseTiming, getNextPhase, CognitiveState } from './cognitive-states.js';
import { cognize, onMindMoment, onSigil, onSoundBrief, onStateEvent, clearListeners, getCurrentCycleIndex } from './real-cog.js';
import { getPool } from './db/index.js';
import { normalizeMindMoment } from './types/mind-moment.js';

// Phase timing constants (for 60s cycle) - use centralized constants
const PERCEPTS_PHASE_MS = PhaseTiming.PERCEPTS_MS;
const SPOOL_PHASE_MS = PhaseTiming.SPOOL_MS;
const SIGILIN_PHASE_MS = PhaseTiming.SIGILIN_MS;
const SIGILHOLD_PHASE_MS = PhaseTiming.SIGILHOLD_MS;
const SIGILOUT_PHASE_MS = PhaseTiming.SIGILOUT_MS;
const RESET_PHASE_MS = PhaseTiming.RESET_MS;

// Total cycle duration (sum of all phases = 60s)
const CYCLE_MS = PERCEPTS_PHASE_MS + SPOOL_PHASE_MS + SIGILIN_PHASE_MS + 
                 SIGILHOLD_PHASE_MS + SIGILOUT_PHASE_MS + RESET_PHASE_MS;

// Both LIVE and DREAM use the same 60s cycle
const LIVE_CYCLE_MS = CYCLE_MS;
const DREAM_CYCLE_MS = CYCLE_MS;

// Prior context depth for LLM
const PRIOR_CONTEXT_DEPTH = 3;

// Phase offsets (for setTimeout scheduling)
const SPOOL_OFFSET_MS = PERCEPTS_PHASE_MS;
const SIGILIN_OFFSET_MS = PERCEPTS_PHASE_MS + SPOOL_PHASE_MS;
const SIGILHOLD_OFFSET_MS = SIGILIN_OFFSET_MS + SIGILIN_PHASE_MS;
const SIGILOUT_OFFSET_MS = SIGILHOLD_OFFSET_MS + SIGILHOLD_PHASE_MS;
const RESET_OFFSET_MS = SIGILOUT_OFFSET_MS + SIGILOUT_PHASE_MS;

export class ConsciousnessLoop {
  constructor(io) {
    this.io = io;
    this.mode = 'DREAM';  // Start in dream mode
    this.intervalId = null;
    this.currentPhase = null;  // Track current phase
    this.phaseStartTime = null;  // Track when phase started
    this.dreamTimeouts = [];  // Track dream dispersal timeouts
    
    // Cycle buffer system for LIVE mode (interleaved A/B buffering)
    this.cycleBuffer = {
      ready: null,      // Completed mind moment ready to display
      placeholder: null // Bootstrap moment (loaded on start)
    };
    
    // Percept queue for LIVE mode
    this.perceptQueue = {
      visual: [],
      audio: []
    };
    
    // Dream buffer system (simple, no complex logic)
    this.dreamBuffer = {
      current: null,
      next: null,
      loading: false
    };
    
    // Track scheduled timeouts for cleanup
    this.phaseTimeouts = [];
    
    // Dream cycle cache (for fast random selection)
    this.dreamCycleCache = [];
    this.dreamCacheInitialized = false;
    
    // Dream loader interval (background loader)
    this.dreamLoaderInterval = null;
  }
  
  /**
   * Start the consciousness loop in current mode
   */
  async start() {
    if (this.intervalId) return;
    
    const intervalMs = this.mode === 'DREAM' ? DREAM_CYCLE_MS : LIVE_CYCLE_MS;
    
    // Set up for LIVE mode
    if (this.mode === 'LIVE') {
      await this.loadPlaceholder();
      this.setupLiveListeners();
    }
    
    // Set up for DREAM mode - initialize cache and load first dreams
    if (this.mode === 'DREAM') {
      await this.initializeDreamCache();
      await this.loadNextDream(); // Load first dream
      await this.loadNextDream(); // Load second dream into buffer
    }
    
    // Start background dream loader (keeps buffer full)
    if (this.mode === 'DREAM') {
      this.startDreamLoader();
    }
    
    // Set up interval - pure timing, no data dependencies
    this.intervalId = setInterval(() => {
      this.tick();
    }, intervalMs);
    
    // Fire first tick immediately
    this.tick();
    
    this.emitState();
    console.log(`🧠 Consciousness loop started (${this.mode} mode, ${intervalMs}ms)`);
  }
  
  /**
   * Load bootstrap placeholder from random mind moment in database
   */
  async loadPlaceholder() {
    try {
      // Try to load a random mind moment from database
      if (process.env.DATABASE_ENABLED === 'true') {
        const pool = getPool();
        
        // Initialize cache if not already done
        if (!this.dreamCacheInitialized) {
          await this.initializeDreamCache();
        }
        
        // Use fast cache approach if available
        if (this.dreamCycleCache.length > 0) {
          const randomIndex = Math.floor(Math.random() * this.dreamCycleCache.length);
          const selectedCycle = this.dreamCycleCache[randomIndex];
          
          const result = await pool.query(`
            SELECT 
              cycle, mind_moment, sigil_phrase, sigil_code,
              circumplex,
              visual_percepts, audio_percepts,
              sigil_png_data, sigil_png_width, sigil_png_height,
              sound_brief
            FROM mind_moments
            WHERE cycle = $1
          `, [selectedCycle]);
          
          if (result.rows.length > 0) {
            const row = result.rows[0];
            
            // Convert PNG Buffer if present
            let png = null;
            if (row.sigil_png_data) {
              png = {
                width: row.sigil_png_width,
                height: row.sigil_png_height,
                data: row.sigil_png_data
              };
            }
            
            this.cycleBuffer.placeholder = {
              cycle: 0, // Always cycle 0 for placeholder
              mindMoment: row.mind_moment,
              sigilPhrase: row.sigil_phrase,
              sigilCode: row.sigil_code,
              circumplex: row.circumplex || { valence: 0, arousal: 0 },
              visualPercepts: Array.isArray(row.visual_percepts) ? row.visual_percepts : [],
              audioPercepts: Array.isArray(row.audio_percepts) ? row.audio_percepts : [],
              priorMoments: [],
              png,
              soundBrief: row.sound_brief || null,
              isDream: false,
              isPlaceholder: true,
              timestamp: new Date().toISOString()
            };
            
            console.log(`🌅 Loaded placeholder from cycle ${row.cycle}: "${row.sigil_phrase}"`);
            return;
          }
        }
      }
      
      // Fallback: No database or query failed
      throw new Error('Database not available or no moments found');
      
    } catch (error) {
      console.warn('⚠️  Could not load placeholder from database:', error.message);
      console.log('📦 Using hardcoded fallback placeholder');
      
      // Hardcoded fallback
      this.cycleBuffer.placeholder = {
        cycle: 0,
        mindMoment: "Consciousness initializing, patterns emerging...",
        sigilPhrase: "First awakening",
        sigilCode: "ctx.fillStyle='#6496C8';ctx.arc(256,256,200,0,Math.PI*2);ctx.fill();",
        circumplex: { valence: 0.3, arousal: -0.5 },
        visualPercepts: [],
        audioPercepts: [],
        priorMoments: [],
        isDream: false,
        isPlaceholder: true,
        timestamp: new Date().toISOString()
      };
    }
  }
  
  /**
   * Stop the consciousness loop
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      
      // Clear all scheduled phase timeouts
      this.phaseTimeouts.forEach(timeout => clearTimeout(timeout));
      this.phaseTimeouts = [];
      
      // Clear dream dispersal timeouts
      this.dreamTimeouts.forEach(timeout => clearTimeout(timeout));
      this.dreamTimeouts = [];
      
      // Clear dream loader interval
      if (this.dreamLoaderInterval) {
        clearInterval(this.dreamLoaderInterval);
        this.dreamLoaderInterval = null;
      }
      
      // Clear listeners if in LIVE mode
      if (this.mode === 'LIVE') {
        clearListeners();
      }
      
      console.log('🛑 Consciousness loop stopped');
    }
  }
  
  /**
   * Switch between LIVE and DREAM modes
   */
  async switchMode(mode) {
    const wasRunning = this.intervalId !== null;
    
    if (wasRunning) {
      this.stop();
    }
    
    this.mode = mode;
    console.log(`🔄 Switched to ${mode} mode`);
    
    if (wasRunning) {
      await this.start();
    } else {
      this.emitState();
    }
  }
  
  /**
   * Execute one consciousness cycle (no async, pure timing)
   */
  tick() {
    if (this.mode === 'DREAM') {
      this.dreamTick();
    } else {
      this.liveTick();
    }
  }
  
  /**
   * DREAM mode: Pure timing - schedule all 6 phases at fixed offsets
   */
  dreamTick() {
    // Clear any previous phase timeouts
    this.phaseTimeouts.forEach(t => clearTimeout(t));
    this.phaseTimeouts = [];
    
    // Get dream from buffer (or use fallback)
    const dream = this.dreamBuffer.current || this.dreamBuffer.next;
    
    if (!dream) {
      console.warn('⚠️  No dream available in buffer!');
      return;
    }
    
    console.log(`💭 Cycle starting: ${dream.cycle} "${dream.sigilPhrase}"`);
    
    // Rotate buffer: current dream is done, next becomes current
    // Only rotate if we have a next dream ready
    if (this.dreamBuffer.next) {
      this.dreamBuffer.current = this.dreamBuffer.next;
      this.dreamBuffer.next = null;
    }
    // Otherwise keep current and hope next cycle has next ready
    
    // Schedule all 6 phases with fixed timing (no async, no dependencies)
    
    // PHASE 1: PERCEPTS at 0s
    this.phaseTimeouts.push(setTimeout(() => {
      this.emitPhase('PERCEPTS', PERCEPTS_PHASE_MS, dream.cycle, true);
      console.log(`  💭 PERCEPTS (${PERCEPTS_PHASE_MS/1000}s)`);
      this.dreamDispersePercepts(dream);
    }, 0));
    
    // PHASE 2: SPOOL at 35s
    this.phaseTimeouts.push(setTimeout(() => {
      this.emitPhase('SPOOL', SPOOL_PHASE_MS, dream.cycle, true);
      console.log(`  💭 SPOOL (${SPOOL_PHASE_MS/1000}s) - broadcasting moment`);
      this.broadcastMoment(dream);
    }, SPOOL_OFFSET_MS));
    
    // PHASE 3: SIGILIN at 37s
    this.phaseTimeouts.push(setTimeout(() => {
      this.emitPhase('SIGILIN', SIGILIN_PHASE_MS, dream.cycle, true);
      console.log(`  💭 SIGILIN (${SIGILIN_PHASE_MS/1000}s)`);
    }, SIGILIN_OFFSET_MS));
    
    // PHASE 4: SIGILHOLD at 40s
    this.phaseTimeouts.push(setTimeout(() => {
      this.emitPhase('SIGILHOLD', SIGILHOLD_PHASE_MS, dream.cycle, true);
      console.log(`  💭 SIGILHOLD (${SIGILHOLD_PHASE_MS/1000}s)`);
    }, SIGILHOLD_OFFSET_MS));
    
    // PHASE 5: SIGILOUT at 55s
    this.phaseTimeouts.push(setTimeout(() => {
      this.emitPhase('SIGILOUT', SIGILOUT_PHASE_MS, dream.cycle, true);
      console.log(`  💭 SIGILOUT (${SIGILOUT_PHASE_MS/1000}s)`);
    }, SIGILOUT_OFFSET_MS));
    
    // PHASE 6: RESET at 58s
    this.phaseTimeouts.push(setTimeout(() => {
      this.emitPhase('RESET', RESET_PHASE_MS, dream.cycle, true);
      console.log(`  💭 RESET (${RESET_PHASE_MS/1000}s)`);
      console.log(`  ✅ Cycle ${dream.cycle} complete`);
    }, RESET_OFFSET_MS));
  }
  
  /**
   * Disperse dream percepts over time (simplified, just schedules timeouts)
   */
  dreamDispersePercepts(dream) {
    // Clear any previous percept timeouts
    this.dreamTimeouts.forEach(t => clearTimeout(t));
    this.dreamTimeouts = [];
    
    // Collect all percepts
    const allPercepts = [
      ...dream.visualPercepts.map(p => ({ ...p, type: 'visual' })),
      ...dream.audioPercepts.map(p => ({ ...p, type: 'audio' }))
    ].filter(p => p.timestamp);
    
    if (allPercepts.length === 0) {
      return;
    }
    
    // Sort chronologically (graceful fallback if timestamps invalid)
    try {
      allPercepts.sort((a, b) => 
        new Date(a.timestamp) - new Date(b.timestamp)
      );
    } catch (error) {
      console.warn('⚠️  Failed to sort percepts, using arrival order:', error.message);
      // Continue with unsorted percepts - still usable
    }
    
    // Calculate timing scale
    const firstTime = new Date(allPercepts[0].timestamp).getTime();
    const lastTime = new Date(allPercepts[allPercepts.length - 1].timestamp).getTime();
    const originalDuration = lastTime - firstTime;
    const scaleFactor = originalDuration > 0 ? PERCEPTS_PHASE_MS / originalDuration : 1;
    
    console.log(`     Dispersing ${allPercepts.length} percepts over ${PERCEPTS_PHASE_MS/1000}s`);
    
    // Schedule percept emissions
    allPercepts.forEach(percept => {
      const perceptTime = new Date(percept.timestamp).getTime();
      const relativeTime = perceptTime - firstTime;
      const scaledTime = relativeTime * scaleFactor;
      
      const timeoutId = setTimeout(() => {
        const { type, timestamp, ...data } = percept;
        
        this.io.emit('perceptReceived', {
          sessionId: 'dream',
          type,
          data,
          timestamp: new Date().toISOString(),
          isDream: true
        });
      }, scaledTime);
      
      this.dreamTimeouts.push(timeoutId);
    });
  }
  
  /**
   * Background dream loader - keeps buffer full
   */
  startDreamLoader() {
    if (this.dreamLoaderInterval) return; // Already running
    
    // Check buffer every 5 seconds
    this.dreamLoaderInterval = setInterval(() => {
      if (this.mode !== 'DREAM' || !this.intervalId) {
        clearInterval(this.dreamLoaderInterval);
        this.dreamLoaderInterval = null;
        return;
      }
      
      // If next slot is empty and not currently loading, load one
      if (!this.dreamBuffer.next && !this.dreamBuffer.loading) {
        this.loadNextDream();
      }
    }, 5000);
  }
  
  /**
   * Load next dream into buffer (background, non-blocking)
   */
  async loadNextDream() {
    if (this.dreamBuffer.loading) return;
    
    this.dreamBuffer.loading = true;
    
    try {
      const dream = await this.recallMoment();
      
      if (dream) {
        // If current is empty, fill it; otherwise fill next
        if (!this.dreamBuffer.current) {
          this.dreamBuffer.current = dream;
          console.log(`📦 Buffer: loaded current dream (cycle ${dream.cycle})`);
        } else {
          this.dreamBuffer.next = dream;
          console.log(`📦 Buffer: loaded next dream (cycle ${dream.cycle})`);
        }
      }
    } catch (error) {
      console.error('❌ Failed to load dream:', error.message);
    } finally {
      this.dreamBuffer.loading = false;
    }
  }
  
  /**
   * LIVE mode: Pure timing with background LLM processing
   */
  liveTick() {
    // Clear any previous phase timeouts
    this.phaseTimeouts.forEach(t => clearTimeout(t));
    this.phaseTimeouts = [];
    
    // Get next global cycle number (will be incremented by cognize())
    const nextCycle = getCurrentCycleIndex() + 1;
    console.log(`🧠 Cycle ${nextCycle} starting`);
    
    // Get moment to display (from previous cycle or placeholder)
    const toDisplay = this.cycleBuffer.ready || this.cycleBuffer.placeholder;
    
    if (!toDisplay) {
      console.warn('⚠️  No mind moment ready! Using placeholder');
    }
    
    const moment = toDisplay || this.cycleBuffer.placeholder;
    
    // Schedule all 6 phases with fixed timing (no async, no dependencies)
    
    // PHASE 1: PERCEPTS at 0s
    this.phaseTimeouts.push(setTimeout(() => {
      this.emitPhase('PERCEPTS', PERCEPTS_PHASE_MS, nextCycle, false);
      console.log(`  🧠 PERCEPTS (${PERCEPTS_PHASE_MS/1000}s) - accumulating`);
      // Percepts queue automatically as they arrive via WebSocket
    }, 0));
    
    // At 35s: Dump percepts and start LLM processing (background)
    this.phaseTimeouts.push(setTimeout(() => {
      const percepts = this.dumpPercepts();
      const count = percepts.visual.length + percepts.audio.length;
      console.log(`  🧠 ${count} percepts dumped → cognizing`);
      this.startBackgroundCognition(percepts);
    }, PERCEPTS_PHASE_MS));
    
    // PHASE 2: SPOOL at 35s
    this.phaseTimeouts.push(setTimeout(() => {
      this.emitPhase('SPOOL', SPOOL_PHASE_MS, moment.cycle, false);
      console.log(`  🧠 SPOOL (${SPOOL_PHASE_MS/1000}s) - broadcasting moment`);
      this.broadcastMoment(moment);
    }, SPOOL_OFFSET_MS));
    
    // PHASE 3: SIGILIN at 37s
    this.phaseTimeouts.push(setTimeout(() => {
      this.emitPhase('SIGILIN', SIGILIN_PHASE_MS, moment.cycle, false);
      console.log(`  🧠 SIGILIN (${SIGILIN_PHASE_MS/1000}s)`);
    }, SIGILIN_OFFSET_MS));
    
    // PHASE 4: SIGILHOLD at 40s
    this.phaseTimeouts.push(setTimeout(() => {
      this.emitPhase('SIGILHOLD', SIGILHOLD_PHASE_MS, moment.cycle, false);
      console.log(`  🧠 SIGILHOLD (${SIGILHOLD_PHASE_MS/1000}s)`);
    }, SIGILHOLD_OFFSET_MS));
    
    // PHASE 5: SIGILOUT at 55s
    this.phaseTimeouts.push(setTimeout(() => {
      this.emitPhase('SIGILOUT', SIGILOUT_PHASE_MS, moment.cycle, false);
      console.log(`  🧠 SIGILOUT (${SIGILOUT_PHASE_MS/1000}s)`);
    }, SIGILOUT_OFFSET_MS));
    
    // PHASE 6: RESET at 58s
    this.phaseTimeouts.push(setTimeout(() => {
      this.emitPhase('RESET', RESET_PHASE_MS, moment.cycle, false);
      console.log(`  🧠 RESET (${RESET_PHASE_MS/1000}s)`);
      console.log(`  ✅ Cycle ${nextCycle} complete`);
    }, RESET_OFFSET_MS));
  }
  
  
  /**
   * Start background LLM processing (fire and forget)
   */
  startBackgroundCognition(percepts) {
    const startTime = Date.now();
    
    // Fire and forget - will use existing event listeners
    (async () => {
      try {
        const predictedCycle = getCurrentCycleIndex() + 1;
        console.log(`  🧠 [Cycle ${predictedCycle}] LLM pipeline starting...`);
        
        // Fire-and-forget: cognize() triggers LLM calls that emit events
        // Results captured by setupLiveListeners() and stored in cycleBuffer.ready
        // They'll be displayed in the NEXT cycle (interleaved A/B pattern)
        await cognize(
          percepts.visual,
          percepts.audio,
          PRIOR_CONTEXT_DEPTH
        );
        
        const duration = Date.now() - startTime;
        const actualCycle = getCurrentCycleIndex();
        console.log(`  ✅ [Cycle ${actualCycle}] Complete (${(duration/1000).toFixed(1)}s)`);
        
      } catch (error) {
        console.error(`  ❌ LLM pipeline failed:`, error.message);
      }
    })();
  }
  
  /**
   * Initialize dream cycle cache (called once at startup in DREAM mode)
   */
  async initializeDreamCache() {
    if (process.env.DATABASE_ENABLED !== 'true') {
      return;
    }

    try {
      const pool = getPool();
      const result = await pool.query(`
        SELECT cycle 
        FROM mind_moments
        WHERE sigil_code IS NOT NULL 
          AND cycle >= 48
          AND (
            jsonb_array_length(visual_percepts) > 0 
            OR jsonb_array_length(audio_percepts) > 0
          )
        ORDER BY cycle ASC
      `);
      
      this.dreamCycleCache = result.rows.map(row => row.cycle);
      this.dreamCacheInitialized = true;
      
      console.log(`💭 Dream cache initialized: ${this.dreamCycleCache.length} eligible cycles`);
    } catch (error) {
      console.error('❌ Failed to initialize dream cache:', error.message);
    }
  }
  
  /**
   * Refresh dream cycle cache (call periodically or after new mind moments)
   */
  async refreshDreamCache() {
    await this.initializeDreamCache();
  }
  
  /**
   * Query a random mind moment from database
   */
  async recallMoment() {
    if (process.env.DATABASE_ENABLED !== 'true') {
      return null;
    }

    try {
      const pool = getPool();
      
      // Initialize cache if needed
      if (!this.dreamCacheInitialized) {
        await this.initializeDreamCache();
      }
      
      // If cache is empty, fall back to old method
      if (this.dreamCycleCache.length === 0) {
        console.warn('⚠️  Dream cache empty, using slow random query');
        return await this.recallMomentSlow();
      }
      
      // Pick random cycle from cache (instant!)
      const randomIndex = Math.floor(Math.random() * this.dreamCycleCache.length);
      const selectedCycle = this.dreamCycleCache[randomIndex];
      
      // Fetch that specific cycle (uses index, fast!)
      const result = await pool.query(`
        SELECT 
          cycle, mind_moment, sigil_phrase, sigil_code,
          circumplex, color,
          visual_percepts, audio_percepts, prior_moment_ids,
          sigil_sdf_data, sigil_sdf_width, sigil_sdf_height,
          sigil_png_data, sigil_png_width, sigil_png_height,
          sound_brief,
          created_at
        FROM mind_moments
        WHERE cycle = $1
      `, [selectedCycle]);

      if (result.rows.length === 0) {
        console.warn(`⚠️  Cycle ${selectedCycle} not found, refreshing cache`);
        await this.refreshDreamCache();
        return null;
      }

      const row = result.rows[0];
      
      // Convert SDF Buffer if present
      let sdf = null;
      if (row.sigil_sdf_data) {
        sdf = {
          width: row.sigil_sdf_width,
          height: row.sigil_sdf_height,
          data: row.sigil_sdf_data
        };
      }
      
      // Convert PNG Buffer if present
      let png = null;
      if (row.sigil_png_data) {
        png = {
          width: row.sigil_png_width,
          height: row.sigil_png_height,
          data: row.sigil_png_data
        };
      }
      
      // Fetch prior moments data if IDs exist
      let priorMoments = [];
      if (row.prior_moment_ids && row.prior_moment_ids.length > 0) {
        try {
          const priorResult = await pool.query(`
            SELECT id, cycle, mind_moment, sigil_phrase, sigil_code
            FROM mind_moments
            WHERE id = ANY($1)
            ORDER BY cycle DESC
          `, [row.prior_moment_ids]);
          
          priorMoments = priorResult.rows.map(p => ({
            id: p.id,
            cycle: p.cycle,
            mindMoment: p.mind_moment,
            sigilPhrase: p.sigil_phrase,
            sigilCode: p.sigil_code
          }));
        } catch (error) {
          console.error('💭 Failed to fetch prior moments:', error.message);
          // Continue without prior moments
        }
      }

      // Use normalization function for consistent structure
      return normalizeMindMoment({
        cycle: row.cycle,
        mind_moment: row.mind_moment,
        sigil_code: row.sigil_code,
        sigil_phrase: row.sigil_phrase,
        circumplex: row.circumplex,
        color: row.color,
        visual_percepts: row.visual_percepts,
        audio_percepts: row.audio_percepts,
        prior_moments: priorMoments, // Pass the fetched moment objects, not IDs
        sdf,
        png,
        sound_brief: row.sound_brief,
        isDream: true
      });
    } catch (error) {
      console.error('💭 Dream error:', error.message);
      return null;
    }
  }
  
  /**
   * Broadcast a mind moment (works for both LIVE and DREAM)
   */
  broadcastMoment(moment) {
    // Emit mind moment event (fully hydrated with all data)
    const mindMomentPayload = {
      cycle: moment.cycle,
      mindMoment: moment.mindMoment,
      sigilPhrase: moment.sigilPhrase,
      
      // Include sigil data (previously in separate 'sigil' event)
      sigilCode: moment.sigilCode || null,
      
      circumplex: moment.circumplex,
      color: moment.color,
      visualPercepts: moment.visualPercepts,
      audioPercepts: moment.audioPercepts,
      priorMoments: moment.priorMoments,
      soundBrief: moment.soundBrief,
      isDream: moment.isDream,
      timestamp: moment.timestamp || new Date().toISOString()
    };
    
    // Add PNG if available (base64 encoded)
    if (moment.png && moment.png.data) {
      mindMomentPayload.sigilPNG = {
        width: moment.png.width,
        height: moment.png.height,
        data: Buffer.from(moment.png.data).toString('base64')
      };
    }
    
    // Add SDF if available (base64 encoded, optional for advanced rendering)
    if (moment.sdf && moment.sdf.data) {
      mindMomentPayload.sigilSDF = {
        width: moment.sdf.width,
        height: moment.sdf.height,
        data: Buffer.from(moment.sdf.data).toString('base64')
      };
    }
    
    this.io.emit('mindMoment', mindMomentPayload);
    
    // Emit sigil event for backward compatibility (DEPRECATED)
    if (moment.sigilCode) {
      const sigilData = {
        cycle: moment.cycle,
        sigilCode: moment.sigilCode,
        sigilPhrase: moment.sigilPhrase,
        isDream: moment.isDream,
        timestamp: moment.timestamp || new Date().toISOString()
      };
      
      if (moment.sdf && moment.sdf.data) {
        sigilData.sdf = {
          width: moment.sdf.width,
          height: moment.sdf.height,
          data: Buffer.from(moment.sdf.data).toString('base64')
        };
      }
      
      if (moment.png && moment.png.data) {
        sigilData.png = {
          width: moment.png.width,
          height: moment.png.height,
          data: Buffer.from(moment.png.data).toString('base64')
        };
      }
      
      this.io.emit('sigil', sigilData);
    }
  }
  
  /**
   * Set up listeners for LIVE mode cognition events
   */
  setupLiveListeners() {
    clearListeners();
    
    // Track current cycle being processed
    let processingCycle = null;
    let processingResult = {};
    
    // Mind moment listener
    onMindMoment((cycle, mindMoment, visualPercepts, audioPercepts, priorMoments, sigilPhrase, circumplex, color) => {
      // Store partial result
      processingCycle = cycle;
      processingResult = {
        cycle,
        mindMoment,
        sigilPhrase,
        circumplex,
        color,
        visualPercepts,
        audioPercepts,
        priorMoments,
        isDream: false,
        isPlaceholder: false
      };
      
      // 🆕 Fire early notification (LIVE mode only)
      // Dashboard gets mind moment text immediately, before sigil/sound generation
      this.io.emit('mindMomentInit', {
        cycle,
        mindMoment,
        sigilPhrase,
        circumplex,
        color,
        visualPercepts,      // shallow copy, no PNGs yet
        audioPercepts,       // shallow copy
        priorMoments,
        timestamp: new Date().toISOString(),
        status: {
          sigilReady: false,
          soundBriefReady: false
        }
      });
    });
    
    // Sigil listener
    onSigil((cycle, sigilCode, sigilPhrase, sigilPNG) => {
      // Complete the result and store in ready buffer
      if (processingCycle === cycle && processingResult.cycle === cycle) {
        processingResult.sigilCode = sigilCode;
        processingResult.sigilPhrase = sigilPhrase;
        
        if (sigilPNG && sigilPNG.data) {
          processingResult.png = {
            width: sigilPNG.width,
            height: sigilPNG.height,
            data: sigilPNG.data
          };
        }
        
        processingResult.timestamp = new Date().toISOString();
        
        // Store in ready buffer for next cycle
        this.cycleBuffer.ready = { ...processingResult };
        
        console.log(`  ✅ [Cycle ${cycle}] Ready for display`);
      }
    });
    
    // Sound brief listener
    onSoundBrief((cycle, soundBrief) => {
      // Add sound brief to processing result
      if (processingCycle === cycle && processingResult.cycle === cycle) {
        processingResult.soundBrief = soundBrief;
        
        // Update ready buffer with sound brief
        if (this.cycleBuffer.ready && this.cycleBuffer.ready.cycle === cycle) {
          this.cycleBuffer.ready.soundBrief = soundBrief;
        }
        
        console.log(`  🎵 [Cycle ${cycle}] Sound brief added`);
      }
    });
    
    // State event listener (keep for cycle events, remove state emissions)
    onStateEvent((eventType, data) => {
      if (eventType === 'cycleStarted') {
        this.io.emit('cycleStarted', data);
      } else if (eventType === 'cycleCompleted') {
        this.io.emit('cycleCompleted', data);
      } else if (eventType === 'cycleFailed') {
        this.io.emit('cycleFailed', data);
      } else if (eventType === 'sigilFailed') {
        this.io.emit('sigilFailed', data);
      }
    });
  }
  
  /**
   * Add a percept to the queue (LIVE mode only)
   */
  addPercept(percept) {
    if (this.mode !== 'LIVE') return;
    
    if (percept.type === 'visual') {
      this.perceptQueue.visual.push(percept);
    } else if (percept.type === 'audio') {
      this.perceptQueue.audio.push(percept);
    }
  }
  
  /**
   * Dump and clear percept queue
   */
  dumpPercepts() {
    const snapshot = {
      visual: [...this.perceptQueue.visual],
      audio: [...this.perceptQueue.audio]
    };
    
    // Clear queue
    this.perceptQueue.visual = [];
    this.perceptQueue.audio = [];
    
    return snapshot;
  }
  
  /**
   * Emit phase event
   */
  emitPhase(phase, duration, cycleNumber, isDream) {
    const now = new Date().toISOString();
    const mode = isDream ? ConsciousnessMode.DREAM : ConsciousnessMode.LIVE;
    const nextPhase = getNextPhase(phase);
    
    // Track current phase and start time
    this.currentPhase = phase;
    this.phaseStartTime = Date.now();
    
    this.io.emit('phase', {
      phase,
      mode,              // NEW: Mode field
      nextPhase,         // NEW: Next phase in sequence
      startTime: now,
      duration,
      cycleNumber,
      isDream            // Keep for backward compatibility
    });
  }
  
  /**
   * DEPRECATED: Emit current cognitive state
   * This method is kept for backward compatibility but no longer used internally.
   * State is now represented by mode + phase combination.
   */
  emitState() {
    // DEPRECATED - keeping for backward compatibility only
    const state = this.mode === 'DREAM' 
      ? CognitiveState.DREAMING 
      : CognitiveState.AGGREGATING;
    
    this.io.emit('cognitiveState', { state });
  }
  
  /**
   * Get current mode
   */
  getMode() {
    return this.mode;
  }
  
  /**
   * Get cycle status information
   */
  getCycleStatus() {
    const isRunning = this.intervalId !== null;
    const intervalMs = this.mode === 'DREAM' ? DREAM_CYCLE_MS : LIVE_CYCLE_MS;
    
    // Calculate time remaining in current phase
    let msRemainingInPhase = null;
    let phaseDurationMs = null;
    
    if (this.currentPhase && this.phaseStartTime) {
      const elapsed = Date.now() - this.phaseStartTime;
      
      // Get duration for current phase
      switch (this.currentPhase) {
        case 'PERCEPTS':
          phaseDurationMs = PERCEPTS_PHASE_MS;
          break;
        case 'SPOOL':
          phaseDurationMs = SPOOL_PHASE_MS;
          break;
        case 'SIGILIN':
          phaseDurationMs = SIGILIN_PHASE_MS;
          break;
        case 'SIGILHOLD':
          phaseDurationMs = SIGILHOLD_PHASE_MS;
          break;
        case 'SIGILOUT':
          phaseDurationMs = SIGILOUT_PHASE_MS;
          break;
        case 'RESET':
          phaseDurationMs = RESET_PHASE_MS;
          break;
      }
      
      if (phaseDurationMs) {
        msRemainingInPhase = Math.max(0, phaseDurationMs - elapsed);
      }
    }
    
    return {
      isRunning,
      mode: this.mode,
      phase: this.currentPhase,
      phaseStartTime: this.phaseStartTime,
      phaseDuration: phaseDurationMs,
      msRemainingInPhase,
      intervalMs,
      nextCycleAt: null,  // Could calculate based on last cycle time if needed
      msUntilNextCycle: null
    };
  }
  
  /**
   * Fallback: Old slow random query (used if cache fails)
   */
  async recallMomentSlow() {
    try {
      const pool = getPool();
      const result = await pool.query(`
        SELECT 
          cycle, mind_moment, sigil_phrase, sigil_code,
          circumplex, color,
          visual_percepts, audio_percepts, prior_moment_ids,
          sigil_sdf_data, sigil_sdf_width, sigil_sdf_height,
          sigil_png_data, sigil_png_width, sigil_png_height,
          sound_brief,
          created_at
        FROM mind_moments
        WHERE sigil_code IS NOT NULL 
          AND cycle >= 48
          AND (
            jsonb_array_length(visual_percepts) > 0 
            OR jsonb_array_length(audio_percepts) > 0
          )
        ORDER BY RANDOM()
        LIMIT 1
      `);

      if (result.rows.length === 0) return null;

      const row = result.rows[0];
      
      // Convert SDF Buffer if present
      let sdf = null;
      if (row.sigil_sdf_data) {
        sdf = {
          width: row.sigil_sdf_width,
          height: row.sigil_sdf_height,
          data: row.sigil_sdf_data
        };
      }
      
      // Convert PNG Buffer if present
      let png = null;
      if (row.sigil_png_data) {
        png = {
          width: row.sigil_png_width,
          height: row.sigil_png_height,
          data: row.sigil_png_data
        };
      }
      
      // Fetch prior moments data if IDs exist
      let priorMoments = [];
      if (row.prior_moment_ids && row.prior_moment_ids.length > 0) {
        try {
          const priorResult = await pool.query(`
            SELECT id, cycle, mind_moment, sigil_phrase, sigil_code
            FROM mind_moments
            WHERE id = ANY($1)
            ORDER BY cycle DESC
          `, [row.prior_moment_ids]);
          
          priorMoments = priorResult.rows.map(p => ({
            id: p.id,
            cycle: p.cycle,
            mindMoment: p.mind_moment,
            sigilPhrase: p.sigil_phrase,
            sigilCode: p.sigil_code
          }));
        } catch (error) {
          console.error('💭 Failed to fetch prior moments:', error.message);
        }
      }

      return normalizeMindMoment({
        cycle: row.cycle,
        mind_moment: row.mind_moment,
        sigil_code: row.sigil_code,
        sigil_phrase: row.sigil_phrase,
        circumplex: row.circumplex,
        color: row.color,
        visual_percepts: row.visual_percepts,
        audio_percepts: row.audio_percepts,
        prior_moments: priorMoments,
        sdf,
        png,
        sound_brief: row.sound_brief,
        isDream: true
      });
    } catch (error) {
      console.error('💭 Dream error (slow query):', error.message);
      return null;
    }
  }
}

