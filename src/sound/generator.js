/**
 * Sound Engine - Generator
 * Calls LLM to generate audio selections
 */

import { callLLM } from '../providers/index.js';
import { validateSelections, parseCSV } from './validator.js';

/**
 * Generate audio selections for a given input text
 * 
 * @param {Object} params - Generation parameters
 * @param {string} params.input - Input text (mind moment or custom)
 * @param {string} params.prompt - System prompt template
 * @param {Object} params.llmSettings - LLM configuration
 * @param {string} params.musicCSV - Music samples CSV content
 * @param {string} params.textureCSV - Texture samples CSV content
 * @returns {Promise<Object>} - Validation result with selections, reasoning, etc.
 */
export async function generateAudioSelections(params) {
  const {
    input,
    prompt,
    llmSettings = {},
    musicCSV,
    textureCSV
  } = params;
  
  if (!input || !prompt) {
    throw new Error('Missing required parameters: input and prompt');
  }
  
  if (!musicCSV || !textureCSV) {
    throw new Error('Missing required CSV files');
  }
  
  // Build full prompt with CSVs
  const systemMessage = `${prompt}\n\nMUSIC SAMPLES:\n${musicCSV}\n\nTEXTURE SAMPLES:\n${textureCSV}`;
  const fullPrompt = `${systemMessage}\n\nCOGNITIVE STATE:\n${input}\n\nGenerate your Sigil Sound selections.`;
  
  // Extract LLM settings
  const temperature = llmSettings.temperature ?? 0.7;
  const maxTokens = llmSettings.maxTokens ?? 500;
  const topP = llmSettings.topP ?? 0.95;
  const topK = llmSettings.topK ?? 40;
  
  // Call LLM
  const startTime = Date.now();
  const response = await callLLM(fullPrompt, {
    temperature,
    maxTokens,
    topP,
    topK
  });
  const duration = Date.now() - startTime;
  
  // Parse CSVs for validation
  const musicSamples = parseCSV(musicCSV);
  const textureSamples = parseCSV(textureCSV);
  
  // Validate response
  const validation = validateSelections(response, musicSamples, textureSamples);
  
  return {
    ...validation,
    duration,
    rawOutput: response
  };
}

