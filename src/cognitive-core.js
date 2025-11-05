/**
 * Cognitive Core - The Robot's "Brain"
 * 
 * Generates emotional plans using configured LLM provider based on:
 * - Current percepts (what's happening now)
 * - Previous emotional state (continuity)
 * - Robot personality (persistent identity)
 */

import { callLLM } from './providers/index.js';
import { ROBOT_PERSONALITY, EMOTIONAL_PLAN_SCHEMA } from './personality-unisphere.js';

/**
 * Generate emotional plan based on current context
 * 
 * @param {string} perceptSummary - Aggregated description of recent percepts
 * @param {Object|null} previousState - Previous emotional plan (for continuity)
 * @returns {Promise<Object>} Emotional plan with operational state and grounded observations
 */
export async function generateEmotionalPlan(perceptSummary, previousState = null) {
  const continuityContext = previousState
    ? `\n\nYour previous state (5 seconds ago):
- Operational mode: ${previousState.operational_state}
- You were focused on: ${previousState.current_focus?.detail || 'general monitoring'}
- Expression: ${previousState.expression}`
    : '\n\nThis is your first moment of awareness in this session.';
  
  const prompt = `In the last 5 seconds, you perceived:
${perceptSummary}${continuityContext}

What is your current operational state? What are you observing and managing right now?

Be specific and direct:
- What exactly did you see/hear from the visitor?
- What building systems are you managing in the background?
- What is your clear, grounded response?

Respond with JSON matching this schema:
${JSON.stringify(EMOTIONAL_PLAN_SCHEMA, null, 2)}

Remember: You are a building consciousness. Be clear, direct, operational. Ground your expression in concrete observations and systems. One sentence. Reference specific things you saw/heard and specific systems you're managing.`;

  try {
    const responseText = await callLLM(
      ROBOT_PERSONALITY,
      prompt,
      {
        temperature: 0.75,  // Balanced - creative but coherent
        maxTokens: 1024
      }
    );

    const emotionalPlan = JSON.parse(responseText);
    
    // Validate structure (basic sanity check)
    if (!emotionalPlan.operational_state || !emotionalPlan.expression) {
      throw new Error('Invalid emotional plan structure');
    }
    
    // Clamp mood values to valid range
    if (emotionalPlan.mood_vector) {
      emotionalPlan.mood_vector.valence = Math.max(-1, Math.min(1, emotionalPlan.mood_vector.valence));
      emotionalPlan.mood_vector.arousal = Math.max(-1, Math.min(1, emotionalPlan.mood_vector.arousal));
    }
    
    return emotionalPlan;
    
  } catch (error) {
    console.error('❌ Error generating emotional plan:', error.message);
    throw error;
  }
}

