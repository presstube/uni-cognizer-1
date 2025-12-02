/**
 * Cognitive State Constants
 * 
 * Defines the possible states of the cognitive loop.
 */

export const CognitiveState = {
  IDLE: 'IDLE',                    // Cognitive loop not running
  AGGREGATING: 'AGGREGATING',      // Waiting for next cycle, aggregating percepts
  COGNIZING: 'COGNIZING',          // LLM call in flight, processing
  VISUALIZING: 'VISUALIZING',      // Generating sigil visualization
  DREAMING: 'DREAMING'             // Replaying random historical mind moments
};

/**
 * Consciousness Mode Constants
 * 
 * Defines the two modes of consciousness operation.
 */
export const ConsciousnessMode = {
  LIVE: 'LIVE',      // Generate from percepts (real-time cognition)
  DREAM: 'DREAM'     // Replay from memory (historical recall)
};

