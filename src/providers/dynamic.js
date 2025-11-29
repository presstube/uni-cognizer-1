/**
 * Dynamic LLM Provider Caller
 * 
 * Calls the appropriate provider based on runtime configuration
 * (not limited to the single provider selected at startup)
 */

import * as geminiProvider from './gemini.js';
import * as anthropicProvider from './anthropic.js';
import * as openaiProvider from './openai.js';

/**
 * Call LLM with dynamic provider selection
 * 
 * @param {string} prompt - The prompt to send
 * @param {Object} config - Configuration including provider
 * @returns {Promise<string>} Response text
 */
export async function callLLMDynamic(prompt, config = {}) {
  const {
    provider = 'gemini',
    model,
    temperature,
    maxTokens,
    topP,
    topK
  } = config;
  
  // Build options object
  const options = {
    model,
    temperature,
    maxTokens,
    topP,
    topK
  };
  
  // Remove undefined and NaN values, but keep legitimate 0 values
  Object.keys(options).forEach(key => {
    const value = options[key];
    if (value === undefined || (typeof value === 'number' && isNaN(value))) {
      delete options[key];
    }
  });
  
  // Call the appropriate provider
  switch (provider.toLowerCase()) {
    case 'gemini':
      if (!process.env.GEMINI_API_KEY) {
        throw new Error('GEMINI_API_KEY not found in environment');
      }
      // Ensure model has 'models/' prefix for Gemini
      if (options.model && !options.model.startsWith('models/')) {
        options.model = `models/${options.model}`;
      }
      return await geminiProvider.callLLM(prompt, options);
      
    case 'anthropic':
      if (!process.env.ANTHROPIC_API_KEY) {
        throw new Error('ANTHROPIC_API_KEY not found in environment');
      }
      // Anthropic uses different signature (system, user, options)
      // For now, treat the whole prompt as user message
      return await anthropicProvider.callLLM('', prompt, options);
      
    case 'openai':
      if (!process.env.OPENAI_API_KEY) {
        throw new Error('OPENAI_API_KEY not found in environment');
      }
      return await openaiProvider.callLLM(prompt, options);
      
    default:
      throw new Error(`Unknown LLM provider: ${provider}. Must be 'openai', 'anthropic', or 'gemini'`);
  }
}

