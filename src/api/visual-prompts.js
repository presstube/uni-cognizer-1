// API routes for Visual Percept Prompt Editor

import {
  getAllVisualPrompts,
  getActiveVisualPrompt,
  getVisualPromptById,
  createVisualPrompt,
  updateVisualPrompt,
  activateVisualPrompt,
  deleteVisualPrompt
} from '../db/visual-prompts.js';

/**
 * GET /api/visual-prompts
 * List all visual prompts
 */
export async function listVisualPrompts(req, res) {
  try {
    const prompts = await getAllVisualPrompts();
    res.json({ prompts });
  } catch (error) {
    console.error('[API] Error listing visual prompts:', error);
    res.status(500).json({ error: 'Failed to list prompts' });
  }
}

/**
 * GET /api/visual-prompts/active
 * Get the active visual prompt
 */
export async function getActiveVisualPromptAPI(req, res) {
  try {
    const prompt = await getActiveVisualPrompt();
    if (!prompt) {
      return res.status(404).json({ error: 'No active prompt found' });
    }
    res.json({ prompt });
  } catch (error) {
    console.error('[API] Error getting active visual prompt:', error);
    res.status(500).json({ error: 'Failed to get active prompt' });
  }
}

/**
 * GET /api/visual-prompts/:id
 * Get visual prompt by ID
 */
export async function getVisualPromptAPI(req, res) {
  try {
    const { id } = req.params;
    const prompt = await getVisualPromptById(id);
    
    if (!prompt) {
      return res.status(404).json({ error: 'Prompt not found' });
    }
    
    res.json({ prompt });
  } catch (error) {
    console.error('[API] Error getting visual prompt:', error);
    res.status(500).json({ error: 'Failed to get prompt' });
  }
}

/**
 * POST /api/visual-prompts
 * Create or update a visual prompt
 */
export async function saveVisualPrompt(req, res) {
  try {
    const { id, name, slug, systemPrompt, userPrompt } = req.body;
    
    if (!name || !slug || !systemPrompt || !userPrompt) {
      return res.status(400).json({ error: 'Name, slug, systemPrompt, and userPrompt are required' });
    }
    
    let savedPrompt;
    
    if (id) {
      // Update existing
      savedPrompt = await updateVisualPrompt(id, name, slug, systemPrompt, userPrompt);
      if (!savedPrompt) {
        return res.status(404).json({ error: 'Prompt not found' });
      }
    } else {
      // Create new
      savedPrompt = await createVisualPrompt(name, slug, systemPrompt, userPrompt);
    }
    
    res.json({ prompt: savedPrompt });
  } catch (error) {
    console.error('[API] Error saving visual prompt:', error);
    
    // Handle unique constraint violation (duplicate slug)
    if (error.code === '23505') {
      return res.status(400).json({ error: 'A prompt with this slug already exists' });
    }
    
    res.status(500).json({ error: 'Failed to save prompt' });
  }
}

/**
 * POST /api/visual-prompts/:id/activate
 * Activate a visual prompt
 */
export async function activateVisualPromptAPI(req, res) {
  try {
    const { id } = req.params;
    
    const prompt = await activateVisualPrompt(id);
    if (!prompt) {
      return res.status(404).json({ error: 'Prompt not found' });
    }
    
    console.log(`[Visual] Activated prompt: ${prompt.name} (${prompt.slug})`);
    
    res.json({ prompt });
  } catch (error) {
    console.error('[API] Error activating visual prompt:', error);
    res.status(500).json({ error: 'Failed to activate prompt' });
  }
}

/**
 * DELETE /api/visual-prompts/:id
 * Delete a visual prompt
 */
export async function deleteVisualPromptAPI(req, res) {
  try {
    const { id } = req.params;
    
    // Check if prompt exists and is not active
    const prompt = await getVisualPromptById(id);
    if (!prompt) {
      return res.status(404).json({ error: 'Prompt not found' });
    }
    
    if (prompt.active) {
      return res.status(400).json({ error: 'Cannot delete active prompt' });
    }
    
    await deleteVisualPrompt(id);
    
    res.json({ success: true });
  } catch (error) {
    console.error('[API] Error deleting visual prompt:', error);
    res.status(500).json({ error: 'Failed to delete prompt' });
  }
}

