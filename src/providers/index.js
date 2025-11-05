/**
 * LLM Provider Factory
 * 
 * Selects and exports the appropriate LLM provider based on configuration
 */

const LLM_PROVIDER = process.env.LLM_PROVIDER || 'anthropic';

let provider;

switch (LLM_PROVIDER.toLowerCase()) {
  case 'openai':
    provider = await import('./openai.js');
    console.log('🤖 Using OpenAI provider (GPT-4o)');
    break;
    
  case 'anthropic':
    provider = await import('./anthropic.js');
    console.log('🤖 Using Anthropic provider (Claude Sonnet 4.5)');
    break;
    
  case 'gemini':
    provider = await import('./gemini.js');
    console.log('🤖 Using Google Gemini provider (Gemini 2.0 Flash)');
    break;
    
  default:
    throw new Error(`Unknown LLM provider: ${LLM_PROVIDER}. Must be 'openai', 'anthropic', or 'gemini'`);
}

// Validate API key is present
if (LLM_PROVIDER.toLowerCase() === 'openai' && !process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY not found in environment');
}

if (LLM_PROVIDER.toLowerCase() === 'anthropic' && !process.env.ANTHROPIC_API_KEY) {
  throw new Error('ANTHROPIC_API_KEY not found in environment');
}

if (LLM_PROVIDER.toLowerCase() === 'gemini' && !process.env.GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY not found in environment');
}

// Export the provider's callLLM function
export const callLLM = provider.callLLM;
export const providerName = LLM_PROVIDER;

