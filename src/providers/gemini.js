/**
 * Google Gemini Provider
 * 
 * Wrapper for Google Generative AI API calls
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

let genAI = null;

/**
 * Lazy initialization of Gemini client
 * Only creates the client when actually needed
 */
function getClient() {
  if (!genAI) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY not found in environment');
    }
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  return genAI;
}

/**
 * Simple string hash function for generating deterministic seeds
 * @private
 */
function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Call Gemini's API
 * 
 * @param {string} prompt - Complete prompt (personality + percepts + instructions)
 * @param {Object} options - Configuration options
 * @returns {Promise<string>} Response text
 */
export async function callLLM(prompt, options = {}) {
  const {
    model = 'models/gemini-2.0-flash-exp',
    temperature = 0.85,
    maxTokens = 500,
    topP = 0.95,
    topK = 40
  } = options;

  try {
    // Determine if this should be deterministic (low temperature AND explicit intent)
    const isDeterministic = temperature < 0.1;
    
    const generationConfig = {
      temperature,
      maxOutputTokens: maxTokens,
      // Gemini API requires topP > 0, so use minimal value if 0 is requested
      topP: topP === 0 ? 0.0001 : topP,
      topK,
      // Add deterministic seed only for low-temperature requests
      // Otherwise use random seed for creative variation
      seed: isDeterministic ? hashString(prompt) : Math.floor(Math.random() * 2147483647)
    };
    
    // Log for debugging determinism
    console.log(`[Gemini] API call - model: ${model}, temp: ${temperature}, topP: ${generationConfig.topP}, topK: ${topK}, seed: ${generationConfig.seed} (${isDeterministic ? 'deterministic' : 'random'}), maxTokens: ${maxTokens}`);
    
    const client = getClient();
    const geminiModel = client.getGenerativeModel({ 
      model,
      generationConfig
    });

    const result = await geminiModel.generateContent(prompt);
    const response = await result.response;
    return response.text();
    
  } catch (error) {
    throw new Error(`Gemini API error: ${error.message}`);
  }
}

