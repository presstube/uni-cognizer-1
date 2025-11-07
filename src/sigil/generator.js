import Anthropic from '@anthropic-ai/sdk';
import { buildPrompt } from './prompt.js';
import { getImageContent } from './image.js';

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
  
  return code;
}

