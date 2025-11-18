// API routes for Sigil Prompt Editor

import {
  getAllSigilPrompts,
  getActiveSigilPrompt,
  getSigilPromptById,
  createSigilPrompt,
  updateSigilPrompt,
  activateSigilPrompt,
  deleteSigilPrompt
} from '../db/sigil-prompts.js';
import { generateSigilWithCustomPrompt } from '../sigil/generator.js';

/**
 * GET /api/sigil-prompts
 * List all sigil prompts
 */
export async function listSigilPrompts(req, res) {
  try {
    const prompts = await getAllSigilPrompts();
    res.json({ prompts });
  } catch (error) {
    console.error('[API] Error listing sigil prompts:', error);
    res.status(500).json({ error: 'Failed to list prompts' });
  }
}

/**
 * GET /api/sigil-prompts/active
 * Get the active sigil prompt
 */
export async function getActiveSigilPromptAPI(req, res) {
  try {
    const prompt = await getActiveSigilPrompt();
    if (!prompt) {
      return res.status(404).json({ error: 'No active prompt found' });
    }
    res.json({ prompt });
  } catch (error) {
    console.error('[API] Error getting active sigil prompt:', error);
    res.status(500).json({ error: 'Failed to get active prompt' });
  }
}

/**
 * GET /api/sigil-prompts/:id
 * Get sigil prompt by ID
 */
export async function getSigilPromptAPI(req, res) {
  try {
    const { id } = req.params;
    const prompt = await getSigilPromptById(id);
    
    if (!prompt) {
      return res.status(404).json({ error: 'Prompt not found' });
    }
    
    res.json({ prompt });
  } catch (error) {
    console.error('[API] Error getting sigil prompt:', error);
    res.status(500).json({ error: 'Failed to get prompt' });
  }
}

/**
 * POST /api/sigil-prompts
 * Create or update a sigil prompt
 */
export async function saveSigilPrompt(req, res) {
  try {
    const { id, name, slug, prompt } = req.body;
    
    if (!name || !slug || !prompt) {
      return res.status(400).json({ error: 'Name, slug, and prompt are required' });
    }
    
    let savedPrompt;
    
    if (id) {
      // Update existing
      savedPrompt = await updateSigilPrompt(id, name, slug, prompt);
      if (!savedPrompt) {
        return res.status(404).json({ error: 'Prompt not found' });
      }
    } else {
      // Create new
      savedPrompt = await createSigilPrompt(name, slug, prompt);
    }
    
    res.json({ prompt: savedPrompt });
  } catch (error) {
    console.error('[API] Error saving sigil prompt:', error);
    
    // Handle unique constraint violation (duplicate slug)
    if (error.code === '23505') {
      return res.status(400).json({ error: 'A prompt with this slug already exists' });
    }
    
    res.status(500).json({ error: 'Failed to save prompt' });
  }
}

/**
 * POST /api/sigil-prompts/:id/activate
 * Activate a sigil prompt
 */
export async function activateSigilPromptAPI(req, res) {
  try {
    const { id } = req.params;
    
    const prompt = await activateSigilPrompt(id);
    if (!prompt) {
      return res.status(404).json({ error: 'Prompt not found' });
    }
    
    console.log(`[Sigil] Activated prompt: ${prompt.name} (${prompt.slug})`);
    
    res.json({ prompt });
  } catch (error) {
    console.error('[API] Error activating sigil prompt:', error);
    res.status(500).json({ error: 'Failed to activate prompt' });
  }
}

/**
 * POST /api/sigil-prompts/test-current
 * Test with current prompt (not saved version)
 * Allows iteration without saving
 */
export async function testCurrentPrompt(req, res) {
  try {
    const { phrase, prompt, includeImage } = req.body;
    
    if (!phrase || !phrase.trim()) {
      return res.status(400).json({ error: 'Phrase is required' });
    }
    
    if (!prompt || !prompt.trim()) {
      return res.status(400).json({ error: 'Prompt is required' });
    }
    
    const imageStatus = includeImage !== false ? 'with image' : 'without image';
    console.log(`[Sigil] Testing current prompt ${imageStatus} - phrase: "${phrase}"`);
    
    // Generate sigil with the prompt from request body
    const calls = await generateSigilWithCustomPrompt(phrase, prompt, includeImage !== false);
    
    res.json({ calls });
  } catch (error) {
    console.error('[API] Error testing current prompt:', error);
    res.status(500).json({ 
      error: 'Failed to generate sigil',
      details: error.message 
    });
  }
}

/**
 * POST /api/sigil-prompts/:id/test
 * Test a sigil prompt with a phrase
 */
export async function testSigilPrompt(req, res) {
  console.log('[API] testSigilPrompt called');
  console.log('[API] Request params:', req.params);
  console.log('[API] Request body:', req.body);
  
  try {
    const { id } = req.params;
    const { phrase } = req.body;
    
    if (!phrase || !phrase.trim()) {
      return res.status(400).json({ error: 'Phrase is required' });
    }
    
    // Get the prompt
    const prompt = await getSigilPromptById(id);
    if (!prompt) {
      return res.status(404).json({ error: 'Prompt not found' });
    }
    
    console.log(`[Sigil] Testing prompt "${prompt.name}" with phrase: "${phrase}"`);
    console.log('\n========== PROMPT SENT TO LLM ==========');
    console.log(prompt.prompt.replace(/\$\{concept\}/g, phrase));
    console.log('========================================\n');
    
    // Generate sigil with custom prompt
    const calls = await generateSigilWithCustomPrompt(phrase, prompt.prompt);
    
    res.json({ calls });
  } catch (error) {
    console.error('[API] Error testing sigil prompt:', error);
    res.status(500).json({ 
      error: 'Failed to generate sigil',
      details: error.message 
    });
  }
}

/**
 * DELETE /api/sigil-prompts/:id
 * Delete a sigil prompt
 */
export async function deleteSigilPromptAPI(req, res) {
  try {
    const { id } = req.params;
    
    // Check if prompt exists and is not active
    const prompt = await getSigilPromptById(id);
    if (!prompt) {
      return res.status(404).json({ error: 'Prompt not found' });
    }
    
    if (prompt.active) {
      return res.status(400).json({ error: 'Cannot delete active prompt' });
    }
    
    await deleteSigilPrompt(id);
    
    res.json({ success: true });
  } catch (error) {
    console.error('[API] Error deleting sigil prompt:', error);
    res.status(500).json({ error: 'Failed to delete prompt' });
  }
}

