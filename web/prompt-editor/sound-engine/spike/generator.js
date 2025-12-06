/**
 * UNI Audio Instrument - LLM Generator
 * 
 * Loads specification and CSVs once, constructs prompt, calls LLM
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { callLLM } from '../../../../src/providers/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load source files once at module initialization
const specification = await fs.readFile(
  path.join(__dirname, '..', 'UNI_Audio_Instrument_Specification.md'),
  'utf-8'
);

const musicCSV = await fs.readFile(
  path.join(__dirname, '..', 'music_samples.csv'),
  'utf-8'
);

const textureCSV = await fs.readFile(
  path.join(__dirname, '..', 'texture_samples.csv'),
  'utf-8'
);

// Build system message once (efficient - reused across calls)
const systemMessage = `${specification}\n\nMUSIC SAMPLES:\n${musicCSV}\n\nTEXTURE SAMPLES:\n${textureCSV}`;

/**
 * Generate audio selections for a given paragraph
 * 
 * @param {string} paragraph - Creative writing paragraph describing cognitive state
 * @param {Object} options - Generation options
 * @param {number} options.temperature - LLM temperature (default: 0.7)
 * @param {number} options.maxTokens - Max tokens for response (default: 500)
 * @returns {Promise<string>} - LLM response with selections
 */
export async function generateAudioSelections(paragraph, options = {}) {
  const temperature = options.temperature ?? 0.7;
  // Gemini 2.0 Flash Exp: 500 tokens is sufficient and fast (~1.2s)
  // Gemini 2.5 Flash: would need 8000+ tokens but is slow (~18s)
  const maxTokens = options.maxTokens ?? 500;
  
  // Combine system message and user prompt into single prompt
  const fullPrompt = `${systemMessage}\n\nCOGNITIVE STATE:\n${paragraph}\n\nGenerate your Sigil Sound selections.`;
  
  const response = await callLLM(fullPrompt, {
    temperature,
    maxTokens
  });
  
  return response;
}
