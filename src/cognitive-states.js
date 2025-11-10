/**
 * Cognitive State Constants
 * 
 * Defines the possible states of the cognitive loop.
 */

export const CognitiveState = {
  AGGREGATING: 'AGGREGATING',  // Waiting for next cycle, aggregating percepts
  COGNIZING: 'COGNIZING',      // LLM call in flight, processing
  VISUALIZING: 'VISUALIZING'   // Generating sigil visualization
};

