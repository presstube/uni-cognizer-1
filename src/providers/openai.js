/**
 * OpenAI Provider
 * 
 * Wrapper for OpenAI API calls
 */

import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

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
    const response = await openai.chat.completions.create({
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

