/**
 * OpenAI Provider
 * 
 * Wrapper for OpenAI API calls
 */

import OpenAI from 'openai';

let openai = null;

/**
 * Lazy initialization of OpenAI client
 * Only creates the client when actually needed
 */
function getClient() {
  if (!openai) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY not found in environment');
    }
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }
  return openai;
}

/**
 * Call OpenAI's API
 * 
 * @param {string} prompt - Complete prompt (personality + percepts + instructions)
 * @param {Object} options - Configuration options
 * @returns {Promise<string>} Response text
 */
export async function callLLM(prompt, options = {}) {
  const {
    model = 'gpt-4o',
    temperature = 0.85,
    maxTokens = 500
  } = options;

  try {
    const client = getClient();
    const response = await client.chat.completions.create({
      model,
      messages: [
        { role: 'user', content: prompt }
      ],
      temperature,
      max_tokens: maxTokens
    });

    return response.choices[0].message.content;
    
  } catch (error) {
    throw new Error(`OpenAI API error: ${error.message}`);
  }
}

