/**
 * Sigil Provider Abstraction
 * Wraps provider system for sigil generation with image support
 */

import { getImageContent } from './image.js';

/**
 * Simple string hash function for generating deterministic seeds
 * @private
 */
function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Clean up generated code
 * @private
 */
function cleanCode(code) {
  if (!code) {
    throw new Error('No code returned from sigil generation');
  }
  
  let cleanCode = code.trim();
  
  if (cleanCode.startsWith('```')) {
    cleanCode = cleanCode.replace(/```(?:javascript|js)?\n?/g, '').replace(/```\s*$/g, '').trim();
  }
  
  if (!cleanCode.includes('ctx.')) {
    console.warn('[Sigil] Generated code does not contain canvas operations');
    throw new Error('Generated code does not contain valid canvas operations');
  }
  
  return cleanCode;
}

/**
 * Get sigil provider function
 * @param {string} providerName - 'anthropic' | 'gemini'
 * @returns {Function} Provider-specific generate function
 */
export function getSigilProvider(providerName) {
  switch (providerName.toLowerCase()) {
    case 'anthropic':
      return generateWithAnthropic;
    case 'gemini':
      return generateWithGemini;
    default:
      throw new Error(`Unknown provider: ${providerName}`);
  }
}

/**
 * Generate sigil using Anthropic Claude
 * @private
 */
async function generateWithAnthropic(options) {
  const {
    concept,
    promptTemplate,
    includeImage = true,
    customImageBase64 = null,
    referenceImagePath = null,
    model = 'claude-sonnet-4-5-20250929',
    temperature = 0.7,
    top_p = 0.9,
    max_tokens = 1024
  } = options;
  
  // Replace ${concept} placeholder
  const finalPrompt = promptTemplate.replace(/\$\{concept\}/g, concept);
  
  // Build user content with image
  const userContent = [];
  
  if (includeImage) {
    let imageContent = null;
    
    if (customImageBase64) {
      // Custom base64 image (from editor testing)
      const base64Data = customImageBase64.includes(',') 
        ? customImageBase64.split(',')[1] 
        : customImageBase64;
      
      let mediaType = 'image/png';
      if (customImageBase64.includes('image/jpeg') || customImageBase64.includes('image/jpg')) {
        mediaType = 'image/jpeg';
      }
      
      imageContent = {
        type: 'image',
        source: {
          type: 'base64',
          media_type: mediaType,
          data: base64Data
        }
      };
      
      console.log('[Sigil] Using custom uploaded image (Anthropic)');
    } else {
      // Use server-side image (custom path or default)
      imageContent = getImageContent(referenceImagePath);
      if (imageContent) {
        console.log(`[Sigil] Using ${referenceImagePath ? 'custom' : 'default'} reference image (Anthropic)`);
      }
    }
    
    if (imageContent) {
      userContent.push(imageContent);
      userContent.push({
        type: 'text',
        text: 'Here is a reference image showing 100 examples of the sigil style I want you to match. Study this carefully.'
      });
    }
  }
  
  userContent.push({
    type: 'text',
    text: finalPrompt
  });
  
  // Use Anthropic SDK directly (needs image support)
  const Anthropic = (await import('@anthropic-ai/sdk')).default;
  const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY
  });
  
  // Claude Sonnet 4.5 doesn't allow both temperature and top_p
  // Use temperature as primary control, ignore top_p for Anthropic
  const messageParams = {
    model,
    max_tokens: max_tokens,
    temperature,
    // Explicitly NOT including top_p - Claude Sonnet 4.5 doesn't support both
    system: 'You are a code generator specializing in minimalist geometric sigils.',
    messages: [{
      role: 'user',
      content: userContent
    }]
  };
  
  // Log for debugging (remove in production if needed)
  console.log(`[Sigil] Anthropic API call - model: ${model}, temperature: ${temperature}, max_tokens: ${max_tokens}`);
  
  const message = await client.messages.create(messageParams);
  
  const code = message.content[0]?.text;
  return cleanCode(code);
}

/**
 * Generate sigil using Google Gemini
 * @private
 */
async function generateWithGemini(options) {
  const {
    concept,
    promptTemplate,
    includeImage = true,
    customImageBase64 = null,
    referenceImagePath = null,
    model = 'models/gemini-3-pro-preview',
    temperature = 0.7,
    top_p = 0.9,
    top_k = 40,
    max_tokens = 1024
  } = options;
  
  // Replace ${concept} placeholder
  const finalPrompt = promptTemplate.replace(/\$\{concept\}/g, concept);
  
  // Build prompt with image for Gemini
  const { GoogleGenerativeAI } = await import('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  
  // Gemini uses Parts array
  const parts = [];
  
  if (includeImage) {
    let imageData = null;
    let mimeType = 'image/png';
    
    if (customImageBase64) {
      // Custom base64 image (from editor testing)
      const base64Data = customImageBase64.includes(',') 
        ? customImageBase64.split(',')[1] 
        : customImageBase64;
      imageData = base64Data;
      if (customImageBase64.includes('image/jpeg') || customImageBase64.includes('image/jpg')) {
        mimeType = 'image/jpeg';
      }
      console.log('[Sigil] Using custom uploaded image (Gemini)');
    } else {
      // Get server-side image (custom path or default)
      const serverImage = getImageContent(referenceImagePath);
      if (serverImage && serverImage.source && serverImage.source.data) {
        imageData = serverImage.source.data;
        mimeType = serverImage.source.media_type || 'image/png';
        console.log(`[Sigil] Using ${referenceImagePath ? 'custom' : 'default'} reference image (Gemini)`);
      }
    }
    
    if (imageData) {
      parts.push({
        inlineData: {
          mimeType,
          data: imageData
        }
      });
      parts.push({
        text: 'Here is a reference image showing 100 examples of the sigil style I want you to match. Study this carefully.'
      });
    }
  }
  
  parts.push({
    text: finalPrompt
  });
  
  // Build generation config
  const generationConfig = {
    temperature,
    // Gemini API requires topP > 0, so use minimal value if 0 is requested
    topP: top_p === 0 ? 0.0001 : top_p,
    topK: top_k,
    maxOutputTokens: max_tokens
  };
  
  // Add seed ONLY for deterministic settings (low temp AND low topK)
  // This ensures creative profiles remain non-deterministic
  const isDeterministic = temperature <= 0.1 && top_k <= 1;
  if (isDeterministic) {
    // Use hash of concept for reproducibility with same input
    generationConfig.seed = hashString(concept);
  } else {
    // Use random seed for creative/non-deterministic generation
    generationConfig.seed = Math.floor(Math.random() * 2147483647);
  }
  
  // Log for debugging determinism
  console.log(`[Sigil] Gemini API call - model: ${model}, temp: ${temperature}, topP: ${generationConfig.topP}, topK: ${top_k}, seed: ${generationConfig.seed} (${isDeterministic ? 'deterministic' : 'random'}), max_tokens: ${max_tokens}`);
  
  // Note: thinkingLevel is not supported in generationConfig for Gemini API
  // Gemini 3 Pro will use its default reasoning capabilities
  
  const geminiModel = genAI.getGenerativeModel({ 
    model,
    generationConfig,
    systemInstruction: 'You are a code generator specializing in minimalist geometric sigils.'
  });
  
  // Generate content with multimodal parts (text + image)
  const result = await geminiModel.generateContent(parts);
  const response = await result.response;
  
  // Check for blocked responses (but allow MAX_TOKENS as it's just truncation)
  if (response.candidates && response.candidates.length > 0) {
    const candidate = response.candidates[0];
    const finishReason = candidate.finishReason;
    
    // Valid finish reasons: STOP (normal completion) and MAX_TOKENS (truncated but usable)
    if (finishReason && finishReason !== 'STOP' && finishReason !== 'MAX_TOKENS') {
      console.error(`[Sigil] Gemini response blocked - finishReason: ${finishReason}`);
      throw new Error(`Gemini API blocked response: ${finishReason}`);
    }
    
    if (finishReason === 'MAX_TOKENS') {
      console.warn(`[Sigil] Response truncated at max tokens (${max_tokens}). Consider increasing max_tokens if code is incomplete.`);
    }
  }
  
  // Extract text from response
  let code = response.text();
  
  // If text() is empty, try extracting from candidates directly (for truncated responses)
  if (!code || code.trim().length === 0) {
    if (response.candidates && response.candidates.length > 0) {
      const candidate = response.candidates[0];
      if (candidate.content && candidate.content.parts) {
        // Extract text from all parts
        code = candidate.content.parts
          .filter(part => part.text)
          .map(part => part.text)
          .join('');
      }
    }
  }
  
  if (!code || code.trim().length === 0) {
    console.error('[Sigil] Empty response from Gemini API');
    if (response.candidates && response.candidates.length > 0) {
      console.error('[Sigil] Finish reason:', response.candidates[0].finishReason);
      console.error('[Sigil] Safety ratings:', response.candidates[0].safetyRatings);
      console.error('[Sigil] Candidate structure:', JSON.stringify(response.candidates[0], null, 2));
    }
    throw new Error('Empty response from Gemini API - no text generated');
  }
  
  return cleanCode(code);
}

