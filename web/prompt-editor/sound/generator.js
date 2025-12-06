/**
 * Generator API Wrapper
 * Handles communication with the sound generation backend
 */

const API_BASE = '/api';

/**
 * Generate audio selections from input text
 * @param {Object} params - Generation parameters
 * @param {string} params.input - Input text (creative paragraph)
 * @param {string} [params.prompt] - Optional prompt override
 * @param {Object} [params.llmSettings] - Optional LLM settings override
 * @param {string} [params.musicCSV] - Optional music CSV override
 * @param {string} [params.textureCSV] - Optional texture CSV override
 * @returns {Promise<Object>} Generation result
 */
export async function generateSelections(params) {
  const { input, prompt, llmSettings, musicCSV, textureCSV } = params;
  
  if (!input || !input.trim()) {
    throw new Error('Input text is required');
  }
  
  const requestBody = {
    input: input.trim()
  };
  
  // Add optional overrides
  if (prompt) requestBody.prompt = prompt;
  if (llmSettings) requestBody.llmSettings = llmSettings;
  if (musicCSV) requestBody.musicCSV = musicCSV;
  if (textureCSV) requestBody.textureCSV = textureCSV;
  
  const response = await fetch(`${API_BASE}/sound-prompts/test`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Generation failed');
  }
  
  const result = await response.json();
  return result;
}

/**
 * Fetch a random mind moment text from the database
 * @returns {Promise<string>} Random mind moment text
 */
export async function getRandomMindMoment() {
  const response = await fetch(`${API_BASE}/sound-prompts/random-mind-moment`);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch mind moment');
  }
  
  const data = await response.json();
  return data.text;
}
