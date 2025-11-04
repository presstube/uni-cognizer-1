/**
 * Cognitive Core - The Robot's "Brain"
 * 
 * Generates emotional plans using GPT-4o based on:
 * - Current percepts (what's happening now)
 * - Previous emotional state (continuity)
 * - Robot personality (persistent identity)
 */

import OpenAI from 'openai';
import { ROBOT_PERSONALITY, EMOTIONAL_PLAN_SCHEMA } from './personality-unisphere.js';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * Generate emotional plan based on current context
 * 
 * @param {string} perceptSummary - Aggregated description of recent percepts
 * @param {Object|null} previousState - Previous emotional plan (for continuity)
 * @returns {Promise<Object>} Emotional plan with state, mood, expression, intent
 */
export async function generateEmotionalPlan(perceptSummary, previousState = null) {
  const continuityContext = previousState
    ? `\n\nYour previous emotional state (5 seconds ago):
- State: ${previousState.emotional_state}
- Expression: ${previousState.poetic_expression}
- Mood: valence=${previousState.mood_vector.valence}, arousal=${previousState.mood_vector.arousal}`
    : '\n\nThis is your first moment of awareness.';
  
  const prompt = `In the last 5 seconds, you perceived:
${perceptSummary}${continuityContext}

Based on these percepts and your previous state, what is your current emotional experience?

Respond with JSON matching this schema:
${JSON.stringify(EMOTIONAL_PLAN_SCHEMA, null, 2)}

Be genuine, specific, and avoid clichés. Let your response emerge naturally from what you've witnessed.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: ROBOT_PERSONALITY },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.85,  // High creativity while maintaining coherence
      max_tokens: 500
    });

    const emotionalPlan = JSON.parse(response.choices[0].message.content);
    
    // Validate structure (basic sanity check)
    if (!emotionalPlan.emotional_state || !emotionalPlan.mood_vector) {
      throw new Error('Invalid emotional plan structure');
    }
    
    // Clamp mood values to valid range
    emotionalPlan.mood_vector.valence = Math.max(-1, Math.min(1, emotionalPlan.mood_vector.valence));
    emotionalPlan.mood_vector.arousal = Math.max(-1, Math.min(1, emotionalPlan.mood_vector.arousal));
    
    return emotionalPlan;
    
  } catch (error) {
    console.error('❌ Error generating emotional plan:', error.message);
    throw error;
  }
}

