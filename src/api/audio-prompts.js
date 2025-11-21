// API routes for Audio Percept Prompt Editor

import {
  getAllAudioPrompts,
  getActiveAudioPrompt,
  getAudioPromptById,
  createAudioPrompt,
  updateAudioPrompt,
  activateAudioPrompt,
  deleteAudioPrompt
} from '../db/audio-prompts.js';

/**
 * GET /api/audio-prompts
 * List all audio prompts
 */
export async function listAudioPrompts(req, res) {
  try {
    const prompts = await getAllAudioPrompts();
    res.json({ prompts });
  } catch (error) {
    console.error('[API] Error listing audio prompts:', error);
    console.error('[API] Error details:', error.message, error.code);
    res.status(500).json({ 
      error: 'Failed to list prompts',
      details: error.message,
      code: error.code
    });
  }
}

/**
 * GET /api/audio-prompts/active
 * Get the active audio prompt
 */
export async function getActiveAudioPromptAPI(req, res) {
  try {
    const prompt = await getActiveAudioPrompt();
    if (!prompt) {
      return res.status(404).json({ error: 'No active prompt found' });
    }
    res.json({ prompt });
  } catch (error) {
    console.error('[API] Error getting active audio prompt:', error);
    console.error('[API] Error details:', error.message, error.code);
    res.status(500).json({ 
      error: 'Failed to get active prompt',
      details: error.message,
      code: error.code
    });
  }
}

/**
 * GET /api/audio-prompts/:id
 * Get audio prompt by ID
 */
export async function getAudioPromptAPI(req, res) {
  try {
    const { id } = req.params;
    const prompt = await getAudioPromptById(id);
    
    if (!prompt) {
      return res.status(404).json({ error: 'Prompt not found' });
    }
    
    res.json({ prompt });
  } catch (error) {
    console.error('[API] Error getting audio prompt:', error);
    res.status(500).json({ error: 'Failed to get prompt' });
  }
}

/**
 * POST /api/audio-prompts
 * Create or update an audio prompt
 */
export async function saveAudioPrompt(req, res) {
  try {
    const { id, name, slug, systemPrompt, userPrompt } = req.body;
    
    if (!name || !slug || !systemPrompt || !userPrompt) {
      return res.status(400).json({ error: 'Name, slug, systemPrompt, and userPrompt are required' });
    }
    
    let savedPrompt;
    
    if (id) {
      // Update existing
      savedPrompt = await updateAudioPrompt(id, name, slug, systemPrompt, userPrompt);
      if (!savedPrompt) {
        return res.status(404).json({ error: 'Prompt not found' });
      }
    } else {
      // Create new
      savedPrompt = await createAudioPrompt(name, slug, systemPrompt, userPrompt);
    }
    
    res.json({ prompt: savedPrompt });
  } catch (error) {
    console.error('[API] Error saving audio prompt:', error);
    
    // Handle unique constraint violation (duplicate slug)
    if (error.code === '23505') {
      return res.status(400).json({ error: 'A prompt with this slug already exists' });
    }
    
    res.status(500).json({ error: 'Failed to save prompt' });
  }
}

/**
 * POST /api/audio-prompts/:id/activate
 * Activate an audio prompt
 */
export async function activateAudioPromptAPI(req, res) {
  try {
    const { id } = req.params;
    
    const prompt = await activateAudioPrompt(id);
    if (!prompt) {
      return res.status(404).json({ error: 'Prompt not found' });
    }
    
    console.log(`[Audio] Activated prompt: ${prompt.name} (${prompt.slug})`);
    
    res.json({ prompt });
  } catch (error) {
    console.error('[API] Error activating audio prompt:', error);
    res.status(500).json({ error: 'Failed to activate prompt' });
  }
}

/**
 * DELETE /api/audio-prompts/:id
 * Delete an audio prompt
 */
export async function deleteAudioPromptAPI(req, res) {
  try {
    const { id } = req.params;
    
    // Check if prompt exists and is not active
    const prompt = await getAudioPromptById(id);
    if (!prompt) {
      return res.status(404).json({ error: 'Prompt not found' });
    }
    
    if (prompt.active) {
      return res.status(400).json({ error: 'Cannot delete active prompt' });
    }
    
    await deleteAudioPrompt(id);
    
    res.json({ success: true });
  } catch (error) {
    console.error('[API] Error deleting audio prompt:', error);
    res.status(500).json({ error: 'Failed to delete prompt' });
  }
}

