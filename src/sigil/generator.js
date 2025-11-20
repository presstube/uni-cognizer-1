import Anthropic from '@anthropic-ai/sdk';
import { buildPrompt } from './prompt.js';
import { getImageContent } from './image.js';
import { getSigilProvider } from './provider.js';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

/**
 * Generates sigil code using Anthropic Claude API
 * @param {string} concept - The concept to generate a sigil for
 * @returns {Promise<string>} Generated canvas drawing code
 */
export async function generateSigil(concept) {
  if (!concept || !concept.trim()) {
    throw new Error('Concept is required for sigil generation');
  }
  
  const imageContent = getImageContent();
  
  const userContent = [];
  
  if (imageContent) {
    userContent.push(imageContent);
    userContent.push({
      type: 'text',
      text: 'Here is a reference image showing 100 examples of the sigil style I want you to match. Study this carefully.'
    });
  }
  
  userContent.push({
    type: 'text',
    text: buildPrompt(concept)
  });
  
  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    system: 'You are a code generator specializing in minimalist geometric sigils.',
    messages: [{
      role: 'user',
      content: userContent
    }]
  });
  
  const code = message.content[0]?.text;
  
  if (!code) {
    throw new Error('No code returned from sigil generation');
  }
  
  // Clean up the code
  let cleanCode = code.trim();
  
  // Remove markdown code blocks if present
  if (cleanCode.startsWith('```')) {
    cleanCode = cleanCode.replace(/```(?:javascript|js)?\n?/g, '').replace(/```\s*$/g, '').trim();
  }
  
  // Validate the code contains canvas operations
  if (!cleanCode.includes('ctx.')) {
    console.warn('[Sigil] Generated code does not contain canvas operations:', cleanCode.substring(0, 100));
    throw new Error('Generated code does not contain valid canvas operations');
  }
  
  return cleanCode;
}

/**
 * Generate sigil with custom prompt template and LLM settings
 * Used by Sigil Prompt Editor for testing different prompts
 * @param {string} concept - The concept phrase
 * @param {string} promptTemplate - Custom prompt with ${concept} placeholder
 * @param {boolean} includeImage - Whether to include reference image (default: true)
 * @param {string|null} customImageBase64 - Custom image as base64 data URL (optional)
 * @param {Object|null} llmSettings - LLM configuration (provider, model, temperature, etc.)
 * @returns {Promise<string>} Generated canvas drawing code
 */
export async function generateSigilWithCustomPrompt(
  concept, 
  promptTemplate, 
  includeImage = true, 
  customImageBase64 = null,
  llmSettings = null
) {
  if (!concept || !concept.trim()) {
    throw new Error('Concept is required for sigil generation');
  }
  
  if (!promptTemplate || !promptTemplate.trim()) {
    throw new Error('Prompt template is required');
  }
  
  // Extract settings or use defaults
  const settings = llmSettings || {
    provider: 'anthropic',
    model: 'claude-sonnet-4-5-20250929',
    temperature: 0.7,
    top_p: 0.9,
    max_tokens: 1024,
    top_k: null
  };
  
  // Get provider function
  const generateFn = getSigilProvider(settings.provider);
  
  // Generate with provider-specific options
  return await generateFn({
    concept,
    promptTemplate,
    includeImage,
    customImageBase64,
    model: settings.model,
    temperature: settings.temperature,
    top_p: settings.top_p,
    top_k: settings.top_k, // Gemini only, ignored by Anthropic
    max_tokens: settings.max_tokens
  });
}

