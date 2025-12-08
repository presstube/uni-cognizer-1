/**
 * Consciousness Mode Constants
 * 
 * Defines the two modes of consciousness operation.
 */
export const ConsciousnessMode = {
  LIVE: 'LIVE',      // Generate from percepts (real-time cognition)
  DREAM: 'DREAM'     // Replay from memory (historical recall)
};

/**
 * Phase Constants
 * 
 * Defines the 6 phases of the universal 60-second consciousness cycle.
 */
export const Phase = {
  PERCEPTS: 'PERCEPTS',      // 0-35s: Sensory input window
  SPOOL: 'SPOOL',            // 35-37s: Load/prepare phase
  SIGILIN: 'SIGILIN',        // 37-40s: Broadcast mind moment
  SIGILHOLD: 'SIGILHOLD',    // 40-55s: Display pause
  SIGILOUT: 'SIGILOUT',      // 55-58s: Fade out
  RESET: 'RESET'             // 58-60s: Cleanup
};

/**
 * Phase Timing Constants (milliseconds)
 */
export const PhaseTiming = {
  PERCEPTS_MS: 35000,
  SPOOL_MS: 2000,
  SIGILIN_MS: 3000,
  SIGILHOLD_MS: 15000,
  SIGILOUT_MS: 3000,
  RESET_MS: 2000
};

/**
 * Phase Sequence
 * 
 * Ordered array of phases for sequence navigation.
 */
export const PHASE_SEQUENCE = [
  Phase.PERCEPTS,
  Phase.SPOOL,
  Phase.SIGILIN,
  Phase.SIGILHOLD,
  Phase.SIGILOUT,
  Phase.RESET
];

/**
 * Get the next phase in the cycle
 * @param {string} currentPhase - Current phase
 * @returns {string} Next phase
 */
export function getNextPhase(currentPhase) {
  const index = PHASE_SEQUENCE.indexOf(currentPhase);
  if (index === -1) return PHASE_SEQUENCE[0]; // Fallback to first phase
  return PHASE_SEQUENCE[(index + 1) % PHASE_SEQUENCE.length];
}

/**
 * Calculate time remaining in current phase
 * @param {number} phaseStartTime - Phase start timestamp (Date.now())
 * @param {number} phaseDuration - Phase duration in milliseconds
 * @returns {number} Milliseconds remaining (or 0 if phase is over)
 */
export function getPhaseTimeRemaining(phaseStartTime, phaseDuration) {
  const elapsed = Date.now() - phaseStartTime;
  return Math.max(0, phaseDuration - elapsed);
}

/**
 * DEPRECATED: Cognitive State Constants
 * 
 * Legacy states - use ConsciousnessMode + Phase instead.
 * Kept for backward compatibility during migration.
 */
export const CognitiveState = {
  IDLE: 'IDLE',                    // DEPRECATED
  AGGREGATING: 'AGGREGATING',      // DEPRECATED - use Phase.PERCEPTS
  COGNIZING: 'COGNIZING',          // DEPRECATED - background processing detail
  VISUALIZING: 'VISUALIZING',      // DEPRECATED - background processing detail
  DREAMING: 'DREAMING'             // DEPRECATED - use ConsciousnessMode.DREAM
};

