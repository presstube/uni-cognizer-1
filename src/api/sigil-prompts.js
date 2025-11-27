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
import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
    const { id, name, slug, prompt, llmSettings, includeImage, referenceImagePath } = req.body;
    
    if (!name || !slug || !prompt) {
      return res.status(400).json({ error: 'Name, slug, and prompt are required' });
    }
    
    // Validate llmSettings if provided
    if (llmSettings) {
      if (!['anthropic', 'gemini'].includes(llmSettings.provider)) {
        return res.status(400).json({ error: 'Invalid provider' });
      }
      // Validate ranges
      if (llmSettings.temperature !== undefined) {
        const maxTemp = llmSettings.provider === 'gemini' ? 2.0 : 1.0;
        if (llmSettings.temperature < 0 || llmSettings.temperature > maxTemp) {
          return res.status(400).json({ error: `Temperature must be 0-${maxTemp}` });
        }
      }
      if (llmSettings.top_p !== undefined && (llmSettings.top_p < 0 || llmSettings.top_p > 1)) {
        return res.status(400).json({ error: 'Top P must be 0-1' });
      }
      if (llmSettings.top_k !== undefined && llmSettings.provider === 'gemini') {
        if (llmSettings.top_k < 1 || llmSettings.top_k > 40) {
          return res.status(400).json({ error: 'Top K must be 1-40 for Gemini' });
        }
      }
    }
    
    let savedPrompt;
    
    if (id) {
      // Update existing
      savedPrompt = await updateSigilPrompt(id, {
        name,
        slug,
        prompt,
        llmSettings,
        includeImage: includeImage !== undefined ? includeImage : undefined,
        referenceImagePath: referenceImagePath !== undefined ? referenceImagePath : undefined
      });
      if (!savedPrompt) {
        return res.status(404).json({ error: 'Prompt not found' });
      }
    } else {
      // Create new
      savedPrompt = await createSigilPrompt(
        name, 
        slug, 
        prompt, 
        llmSettings,
        includeImage !== false,
        referenceImagePath || null
      );
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
    const { phrase, prompt, includeImage, customImage, llmSettings } = req.body;
    
    if (!phrase || !phrase.trim()) {
      return res.status(400).json({ error: 'Phrase is required' });
    }
    
    if (!prompt || !prompt.trim()) {
      return res.status(400).json({ error: 'Prompt is required' });
    }
    
    const imageStatus = includeImage !== false 
      ? (customImage ? 'with custom image' : 'with default image')
      : 'without image';
    const provider = llmSettings?.provider || 'anthropic';
    console.log(`[Sigil] Testing ${provider} ${imageStatus} - phrase: "${phrase}"`);
    
    // Generate sigil with LLM settings
    const calls = await generateSigilWithCustomPrompt(
      phrase, 
      prompt, 
      includeImage !== false,
      customImage || null,
      llmSettings || null
    );
    
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

/**
 * POST /api/sigil-prompts/upload-reference-image
 * Upload a custom reference image for sigil prompts
 * Accepts base64-encoded image in request body
 */
export async function uploadReferenceImage(req, res) {
  try {
    const { image } = req.body;
    
    if (!image) {
      return res.status(400).json({ error: 'Image data is required' });
    }
    
    // Parse base64 data URL
    const matches = image.match(/^data:image\/(png|jpeg|jpg);base64,(.+)$/);
    if (!matches) {
      return res.status(400).json({ error: 'Invalid image format. Expected PNG or JPEG.' });
    }
    
    const extension = matches[1] === 'jpeg' || matches[1] === 'jpg' ? 'jpg' : 'png';
    const base64Data = matches[2];
    
    // Generate unique filename
    const filename = `${randomUUID()}.${extension}`;
    const relativePath = `sigil-references/${filename}`;
    const absolutePath = path.join(__dirname, '../../assets/', relativePath);
    
    // Ensure directory exists
    const dirPath = path.dirname(absolutePath);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    
    // Write file
    fs.writeFileSync(absolutePath, Buffer.from(base64Data, 'base64'));
    
    console.log(`[Sigil] Saved reference image: ${relativePath}`);
    
    res.json({ path: relativePath });
  } catch (error) {
    console.error('[API] Error uploading reference image:', error);
    res.status(500).json({ error: 'Failed to upload image' });
  }
}

