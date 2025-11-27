import Anthropic from '@anthropic-ai/sdk';
import { buildPrompt } from './prompt.js';
import { getImageContent } from './image.js';
import { getSigilProvider } from './provider.js';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

// Default LLM settings (fallback when no DB prompt)
const DEFAULT_LLM_SETTINGS = {
  provider: 'anthropic',
  model: 'claude-sonnet-4-20250514',
  temperature: 0.7,
  top_p: 0.9,
  max_tokens: 1024,
  top_k: null
};

/**
 * Generates sigil code using the active prompt from DB (or fallback defaults)
 * @param {string} concept - The concept to generate a sigil for
 * @returns {Promise<string>} Generated canvas drawing code
 */
export async function generateSigil(concept) {
  if (!concept || !concept.trim()) {
    throw new Error('Concept is required for sigil generation');
  }
  
  // Try to load active prompt from DB
  let activePrompt = null;
  if (process.env.DATABASE_ENABLED === 'true') {
    try {
      const { getActiveSigilPrompt } = await import('../db/sigil-prompts.js');
      activePrompt = await getActiveSigilPrompt();
    } catch (error) {
      console.warn('[Sigil] Failed to load active prompt from DB, using defaults:', error.message);
    }
  }
  
  // Extract settings from active prompt or use defaults
  const promptTemplate = activePrompt?.prompt || null;
  const includeImage = activePrompt?.include_image ?? true;
  const referenceImagePath = activePrompt?.reference_image_path || null;
  const llmSettings = activePrompt?.llm_settings || DEFAULT_LLM_SETTINGS;
  
  // Log which prompt is being used
  if (activePrompt) {
    console.log(`[Sigil] Using DB prompt: "${activePrompt.name}" (${llmSettings.provider}/${llmSettings.model})`);
    if (referenceImagePath) {
      console.log(`[Sigil] Using custom reference image: ${referenceImagePath}`);
    }
  } else {
    console.log('[Sigil] Using hardcoded fallback prompt');
  }
  
  // If we have a DB prompt, use the custom prompt path
  if (promptTemplate) {
    return await generateSigilWithCustomPrompt(
      concept,
      promptTemplate,
      includeImage,
      null, // No base64 custom image from live cognition
      llmSettings,
      referenceImagePath // Pass the file path for custom image
    );
  }
  
  // Fallback: Use original hardcoded behavior
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
 * @param {string|null} customImageBase64 - Custom image as base64 data URL (optional, for editor testing)
 * @param {Object|null} llmSettings - LLM configuration (provider, model, temperature, etc.)
 * @param {string|null} referenceImagePath - Path to custom reference image (optional, for production)
 * @returns {Promise<string>} Generated canvas drawing code
 */
export async function generateSigilWithCustomPrompt(
  concept, 
  promptTemplate, 
  includeImage = true, 
  customImageBase64 = null,
  llmSettings = null,
  referenceImagePath = null
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
    referenceImagePath, // Pass file path for custom server-side image
    model: settings.model,
    temperature: settings.temperature,
    top_p: settings.top_p,
    top_k: settings.top_k, // Gemini only, ignored by Anthropic
    max_tokens: settings.max_tokens
  });
}

