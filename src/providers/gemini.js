/**
 * Google Gemini Provider
 * 
 * Wrapper for Google Generative AI API calls
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Call Gemini's API
 * 
 * @param {string} prompt - Complete prompt (personality + percepts + instructions)
 * @param {Object} options - Configuration options
 * @returns {Promise<string>} Response text
 */
export async function callLLM(prompt, options = {}) {
  const {
    model = 'models/gemini-2.0-flash',
    temperature = 0.85,
    maxTokens = 500
  } = options;

  try {
    const geminiModel = genAI.getGenerativeModel({ 
      model,
      generationConfig: {
        temperature,
        maxOutputTokens: maxTokens
      }
    });

    const result = await geminiModel.generateContent(prompt);
    const response = await result.response;
    return response.text();
    
  } catch (error) {
    throw new Error(`Gemini API error: ${error.message}`);
  }
}

