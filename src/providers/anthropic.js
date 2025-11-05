/**
 * Anthropic Provider
 * 
 * Wrapper for Anthropic (Claude) API calls
 */

import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

/**
 * Call Anthropic's API
 * 
 * @param {string} systemPrompt - System/personality prompt
 * @param {string} userPrompt - User prompt with percepts and instructions
 * @param {Object} options - Configuration options
 * @returns {Promise<string>} Response text (JSON string)
 */
export async function callLLM(systemPrompt, userPrompt, options = {}) {
  const {
    model = 'claude-sonnet-4-20250514',
    temperature = 0.85,
    maxTokens = 1024
  } = options;

  // Anthropic doesn't have native JSON mode, so we enhance the prompt
  const enhancedPrompt = `${userPrompt}

CRITICAL: Respond ONLY with valid JSON. Do not include any explanation, markdown formatting, or text outside the JSON object. Your entire response must be parseable JSON.`;

  try {
    const response = await anthropic.messages.create({
      model,
      max_tokens: maxTokens,  // Required by Anthropic
      temperature,
      system: systemPrompt,  // Separate system parameter
      messages: [
        { role: 'user', content: enhancedPrompt }
      ]
    });

    // Extract text from Anthropic's response structure
    return response.content[0].text;
    
  } catch (error) {
    throw new Error(`Anthropic API error: ${error.message}`);
  }
}

