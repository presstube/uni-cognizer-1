/**
 * Unified Consciousness Loop
 * 
 * ONE consciousness with TWO modes:
 * - LIVE: Generate mind moments from new percepts (LLM)
 * - DREAM: Replay mind moments from memory (DB query)
 * 
 * Both modes produce identical output structure and broadcast identically.
 */

import { CognitiveState } from './cognitive-states.js';
import { cognize, onMindMoment, onSigil, onStateEvent, clearListeners } from './real-cog.js';
import { getPool } from './db/index.js';
import { normalizeMindMoment } from './types/mind-moment.js';

const LIVE_CYCLE_MS = parseInt(process.env.COGNITIVE_CYCLE_MS, 10) || 5000;
const DREAM_CYCLE_MS = parseInt(process.env.DREAM_CYCLE_MS, 10) || 30000;
const PRIOR_CONTEXT_DEPTH = 3;

export class ConsciousnessLoop {
  constructor(io) {
    this.io = io;
    this.mode = 'DREAM';  // Start in dream mode
    this.intervalId = null;
    this.currentState = CognitiveState.IDLE;
    this.dreamTimeouts = [];  // Track dream dispersal timeouts
    
    // Percept queue for LIVE mode
    this.perceptQueue = {
      visualPercepts: [],
      audioPercepts: []
    };
  }
  
  /**
   * Start the consciousness loop in current mode
   */
  start() {
    if (this.intervalId) return;
    
    const intervalMs = this.mode === 'DREAM' ? DREAM_CYCLE_MS : LIVE_CYCLE_MS;
    
    // Set up listeners for LIVE mode
    if (this.mode === 'LIVE') {
      this.setupLiveListeners();
    }
    
    this.intervalId = setInterval(async () => {
      await this.tick();
    }, intervalMs);
    
    this.emitState();
    console.log(`🧠 Consciousness loop started (${this.mode} mode, ${intervalMs}ms)`);
  }
  
  /**
   * Stop the consciousness loop
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      
      // Clear dream dispersal timeouts
      this.dreamTimeouts.forEach(timeout => clearTimeout(timeout));
      this.dreamTimeouts = [];
      
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
  switchMode(mode) {
    const wasRunning = this.intervalId !== null;
    
    if (wasRunning) {
      this.stop();
    }
    
    this.mode = mode;
    console.log(`🔄 Switched to ${mode} mode`);
    
    if (wasRunning) {
      this.start();
    } else {
      this.emitState();
    }
  }
  
  /**
   * Execute one consciousness cycle
   */
  async tick() {
    if (this.mode === 'DREAM') {
      await this.dreamTick();
    } else {
      await this.liveTick();
    }
  }
  
  /**
   * DREAM mode: Recall and replay a moment with temporal percept dispersal
   */
  async dreamTick() {
    const dream = await this.recallMoment();
    
    if (!dream) return;
    
    console.log(`💭 Dreaming of cycle ${dream.cycle}: "${dream.sigilPhrase}"`);
    
    // Collect all percepts with type markers
    const allPercepts = [
      ...dream.visualPercepts.map(p => ({ ...p, type: 'visual' })),
      ...dream.audioPercepts.map(p => ({ ...p, type: 'audio' }))
    ].filter(p => p.timestamp); // Only include percepts with timestamps
    
    // Fallback: If no percepts, emit immediately
    if (allPercepts.length === 0) {
      console.log('  💭 No percepts in dream, broadcasting immediately');
      this.broadcastMoment(dream);
      return;
    }
    
    // Clear any pending timeouts from previous dream
    this.dreamTimeouts.forEach(t => clearTimeout(t));
    this.dreamTimeouts = [];
    
    // Sort percepts chronologically by timestamp
    try {
      allPercepts.sort((a, b) => 
        new Date(a.timestamp) - new Date(b.timestamp)
      );
    } catch (error) {
      console.error('⚠️  Failed to sort percepts by timestamp:', error.message);
      // Continue with unsorted percepts
    }
    
    // Calculate timing pattern from original timestamps
    const firstTimestamp = new Date(allPercepts[0].timestamp).getTime();
    const lastTimestamp = new Date(allPercepts[allPercepts.length - 1].timestamp).getTime();
    const originalDuration = lastTimestamp - firstTimestamp;
    
    // PHASE 1: Percept dispersal (0-18s) - 60% of cycle
    const dispersalWindow = 18000;
    const scaleFactor = originalDuration > 0 ? dispersalWindow / originalDuration : 1;
    
    console.log(`  💭 Replaying ${allPercepts.length} percepts over ${(dispersalWindow / 1000).toFixed(1)}s`);
    console.log(`     Original duration: ${(originalDuration / 1000).toFixed(1)}s, scale: ${scaleFactor.toFixed(2)}x`);
    
    // Emit percepts with scaled timing
    allPercepts.forEach((percept, index) => {
      const perceptTime = new Date(percept.timestamp).getTime();
      const relativeTime = perceptTime - firstTimestamp;
      const scaledTime = relativeTime * scaleFactor;
      
      const timeoutId = setTimeout(() => {
        const { type, timestamp, ...data } = percept;
        
        this.io.emit('perceptReceived', {
          sessionId: 'dream',
          type,
          data,
          timestamp: new Date().toISOString(), // Current time for display
          originalTimestamp: timestamp,        // Preserve original for reference
          isDream: true                        // Flag for client awareness
        });
        
        // Log percept emission
        if (type === 'visual') {
          console.log(`  💭 [${(scaledTime / 1000).toFixed(1)}s] 👁️  ${data.emoji} ${data.action}`);
        } else {
          const preview = data.transcript 
            ? `"${data.transcript.slice(0, 40)}..."` 
            : data.analysis;
          console.log(`  💭 [${(scaledTime / 1000).toFixed(1)}s] 🎤 ${data.emoji} ${preview}`);
        }
      }, scaledTime);
      
      this.dreamTimeouts.push(timeoutId);
    });
    
    // PHASE 2: Mind moment + sigil emission (20s)
    const momentTimeout = setTimeout(() => {
      console.log(`  💭 [20.0s] Mind moment + sigil emitted`);
      this.broadcastMoment(dream);
    }, 20000);
    
    this.dreamTimeouts.push(momentTimeout);
    
    // PHASE 3: Clear display (29.9s) - right before next cycle
    const clearDisplayTimeout = setTimeout(() => {
      console.log(`  💭 [29.9s] Clearing display for next dream`);
      this.clearDisplay({
        clearPercepts: true,
        clearMindMoment: true,
        clearSigil: true
      });
    }, 29900);
    
    this.dreamTimeouts.push(clearDisplayTimeout);
  }
  
  /**
   * LIVE mode: Generate new moment from percepts
   */
  async liveTick() {
    const { visualPercepts, audioPercepts } = this.dumpPercepts();
    await cognize(visualPercepts, audioPercepts, PRIOR_CONTEXT_DEPTH);
    // Note: actual broadcasting happens via listeners set up in setupLiveListeners()
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
      const result = await pool.query(`
        SELECT 
          cycle, mind_moment, sigil_phrase, sigil_code,
          kinetic, lighting,
          visual_percepts, audio_percepts, prior_moment_ids,
          sigil_sdf_data, sigil_sdf_width, sigil_sdf_height,
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
        kinetic: row.kinetic,
        lighting: row.lighting,
        visual_percepts: row.visual_percepts,
        audio_percepts: row.audio_percepts,
        prior_moments: priorMoments, // Pass the fetched moment objects, not IDs
        sdf,
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
    // Emit mind moment event
    this.io.emit('mindMoment', {
      cycle: moment.cycle,
      mindMoment: moment.mindMoment,
      sigilPhrase: moment.sigilPhrase,
      kinetic: moment.kinetic,
      lighting: moment.lighting,
      visualPercepts: moment.visualPercepts,
      audioPercepts: moment.audioPercepts,
      priorMoments: moment.priorMoments,
      isDream: moment.isDream,
      timestamp: moment.timestamp || new Date().toISOString()
    });
    
    // Emit sigil event (if available)
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
      
      this.io.emit('sigil', sigilData);
    }
  }
  
  /**
   * Set up listeners for LIVE mode cognition events
   */
  setupLiveListeners() {
    clearListeners();
    
    // Mind moment listener
    onMindMoment((cycle, mindMoment, visualPercepts, audioPercepts, priorMoments, sigilPhrase, kinetic, lighting) => {
      this.currentState = CognitiveState.VISUALIZING;
      
      // Broadcast mind moment
      this.io.emit('mindMoment', {
        cycle,
        mindMoment,
        sigilPhrase,
        kinetic,
        lighting,
        visualPercepts,
        audioPercepts,
        priorMoments,
        isDream: false,
        timestamp: new Date().toISOString()
      });
      
      // Emit state change
      this.io.emit('cognitiveState', { state: CognitiveState.VISUALIZING });
    });
    
    // Sigil listener
    onSigil((cycle, sigilCode, sigilPhrase, sigilSDF) => {
      const sigilData = {
        cycle,
        sigilCode,
        sigilPhrase,
        isDream: false,
        timestamp: new Date().toISOString()
      };
      
      if (sigilSDF && sigilSDF.data) {
        sigilData.sdf = {
          width: sigilSDF.width,
          height: sigilSDF.height,
          data: Buffer.from(sigilSDF.data).toString('base64')
        };
      }
      
      this.io.emit('sigil', sigilData);
      
      // If loop has stopped, transition to IDLE
      if (!this.intervalId) {
        this.currentState = CognitiveState.IDLE;
        this.io.emit('cognitiveState', { state: CognitiveState.IDLE });
        console.log('💤 Transitioned to IDLE after in-flight operations');
      }
    });
    
    // State event listener
    onStateEvent((eventType, data) => {
      if (eventType === 'cycleStarted') {
        this.currentState = CognitiveState.COGNIZING;
        this.io.emit('cognitiveState', { state: CognitiveState.COGNIZING });
        this.io.emit('cycleStarted', data);
      } else if (eventType === 'cycleCompleted') {
        if (!this.intervalId) {
          this.currentState = CognitiveState.IDLE;
          this.io.emit('cognitiveState', { state: CognitiveState.IDLE });
        } else {
          this.currentState = CognitiveState.AGGREGATING;
          this.io.emit('cognitiveState', { state: CognitiveState.AGGREGATING });
        }
        this.io.emit('cycleCompleted', data);
      } else if (eventType === 'cycleFailed') {
        this.currentState = CognitiveState.AGGREGATING;
        this.io.emit('cognitiveState', { state: CognitiveState.AGGREGATING });
        this.io.emit('cycleFailed', data);
      } else if (eventType === 'transitionToIdle') {
        this.currentState = CognitiveState.IDLE;
        this.io.emit('cognitiveState', { state: CognitiveState.IDLE });
        console.log('💤 Transitioned to IDLE after in-flight operations');
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
      this.perceptQueue.visualPercepts.push(percept);
    } else if (percept.type === 'audio') {
      this.perceptQueue.audioPercepts.push(percept);
    }
  }
  
  /**
   * Dump and clear percept queue
   */
  dumpPercepts() {
    const snapshot = {
      visualPercepts: [...this.perceptQueue.visualPercepts],
      audioPercepts: [...this.perceptQueue.audioPercepts]
    };
    
    this.perceptQueue.visualPercepts.length = 0;
    this.perceptQueue.audioPercepts.length = 0;
    
    return snapshot;
  }
  
  /**
   * Emit current cognitive state
   */
  emitState() {
    const state = this.mode === 'DREAM' 
      ? CognitiveState.DREAMING 
      : this.currentState;
    
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
    
    return {
      isRunning,
      mode: this.mode,
      intervalMs,
      state: this.mode === 'DREAM' ? CognitiveState.DREAMING : this.currentState,
      nextCycleAt: null,  // Could calculate based on last cycle time if needed
      msUntilNextCycle: null
    };
  }
  
  /**
   * Clear display on clients (used by both LIVE and DREAM modes)
   * @param {Object} options - What to clear
   */
  clearDisplay(options = {}) {
    const {
      clearPercepts = true,
      clearMindMoment = true,
      clearSigil = true
    } = options;
    
    this.io.emit('clearDisplay', {
      clearPercepts,
      clearMindMoment,
      clearSigil,
      timestamp: new Date().toISOString()
    });
    
    const cleared = [];
    if (clearPercepts) cleared.push('percepts');
    if (clearMindMoment) cleared.push('mindMoment');
    if (clearSigil) cleared.push('sigil');
    
    console.log(`🧹 Display cleared: ${cleared.join(', ')}`);
  }
}

