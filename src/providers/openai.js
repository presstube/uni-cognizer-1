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
 * @param {string} systemPrompt - System/personality prompt
 * @param {string} userPrompt - User prompt with percepts and instructions
 * @param {Object} options - Configuration options
 * @returns {Promise<string>} Response text (JSON string)
 */
export async function callLLM(systemPrompt, userPrompt, options = {}) {
  const {
    model = 'gpt-4o',
    temperature = 0.85,
    maxTokens = 500
  } = options;

  try {
    const response = await openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      response_format: { type: 'json_object' },  // Native JSON mode
      temperature,
      max_tokens: maxTokens
    });

    return response.choices[0].message.content;
    
  } catch (error) {
    throw new Error(`OpenAI API error: ${error.message}`);
  }
}

