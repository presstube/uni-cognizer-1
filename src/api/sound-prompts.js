/**
 * Sound Prompts API
 * API routes for sound engine prompt management
 */

import * as db from '../db/sound-prompts.js';
import { generateAudioSelections } from '../sound/generator.js';
import { getPool } from '../db/index.js';

// List all prompts
export async function listSoundPrompts(req, res) {
  try {
    const prompts = await db.listSoundPrompts();
    res.json({ prompts });
  } catch (error) {
    console.error('Failed to list sound prompts:', error);
    res.status(500).json({ error: 'Failed to load prompts' });
  }
}

// Get single prompt
export async function getSoundPromptAPI(req, res) {
  try {
    const prompt = await db.getSoundPrompt(req.params.id);
    if (!prompt) {
      return res.status(404).json({ error: 'Prompt not found' });
    }
    res.json({ prompt });
  } catch (error) {
    console.error('Failed to get sound prompt:', error);
    res.status(500).json({ error: 'Failed to load prompt' });
  }
}

// Get active prompt
export async function getActiveSoundPromptAPI(req, res) {
  try {
    const prompt = await db.getActiveSoundPrompt();
    if (!prompt) {
      return res.status(404).json({ error: 'No active prompt' });
    }
    res.json({ prompt });
  } catch (error) {
    console.error('Failed to get active sound prompt:', error);
    res.status(500).json({ error: 'Failed to load active prompt' });
  }
}

// Save prompt (create or update)
export async function saveSoundPrompt(req, res) {
  try {
    const { id, name, slug, prompt, llmSettings } = req.body;
    
    if (!name || !slug || !prompt) {
      return res.status(400).json({ error: 'Missing required fields: name, slug, prompt' });
    }
    
    const savedPrompt = await db.saveSoundPrompt({
      id,
      name,
      slug,
      prompt,
      llmSettings: llmSettings || {}
    });
    
    res.json({ prompt: savedPrompt });
  } catch (error) {
    console.error('Failed to save sound prompt:', error);
    
    // Handle unique constraint violation
    if (error.code === '23505' && error.constraint === 'sound_prompts_slug_key') {
      return res.status(400).json({ error: 'A prompt with this slug already exists' });
    }
    
    res.status(500).json({ error: error.message });
  }
}

// Activate prompt
export async function activateSoundPromptAPI(req, res) {
  try {
    const prompt = await db.activateSoundPrompt(req.params.id);
    res.json({ prompt });
  } catch (error) {
    console.error('Failed to activate sound prompt:', error);
    res.status(500).json({ error: 'Failed to activate prompt' });
  }
}

// Delete prompt
export async function deleteSoundPromptAPI(req, res) {
  try {
    await db.deleteSoundPrompt(req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to delete sound prompt:', error);
    res.status(500).json({ error: 'Failed to delete prompt' });
  }
}

// Test generation (without saving prompt)
export async function testSoundPrompt(req, res) {
  try {
    let { input, prompt, llmSettings, musicCSV, textureCSV } = req.body;
    
    if (!input) {
      return res.status(400).json({ error: 'Missing input text' });
    }
    
    // If no prompt provided, fetch the active one
    if (!prompt) {
      const activePrompt = await db.getActiveSoundPrompt();
      if (!activePrompt) {
        return res.status(400).json({ error: 'No active prompt found. Please provide a prompt or activate one.' });
      }
      prompt = activePrompt.prompt;
      llmSettings = llmSettings || activePrompt.llm_settings || {};
    }
    
    // Get active CSVs if not provided
    let music = musicCSV;
    let texture = textureCSV;
    
    if (!music || !texture) {
      const csvs = await db.getActiveCSVs();
      music = music || csvs.music?.content;
      texture = texture || csvs.texture?.content;
    }
    
    // Fall back to defaults if no active CSVs
    if (!music || !texture) {
      const defaults = await db.getDefaultCSVs();
      music = music || defaults.music?.content;
      texture = texture || defaults.texture?.content;
    }
    
    if (!music || !texture) {
      return res.status(400).json({ error: 'CSV files not available' });
    }
    
    const result = await generateAudioSelections({
      input,
      prompt,
      llmSettings: llmSettings || {},
      musicCSV: music,
      textureCSV: texture
    });
    
    res.json(result);
  } catch (error) {
    console.error('Sound generation failed:', error);
    res.status(500).json({ error: error.message });
  }
}

// Get random mind moment for testing
export async function getRandomMindMoment(req, res) {
  try {
    const pool = getPool();
    
    // Get a random mind moment with text
    const result = await pool.query(`
      SELECT mind_moment
      FROM mind_moments
      WHERE mind_moment IS NOT NULL
        AND mind_moment != ''
        AND LENGTH(mind_moment) > 20
      ORDER BY RANDOM()
      LIMIT 1
    `);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No mind moments found' });
    }
    
    res.json({ text: result.rows[0].mind_moment });
  } catch (error) {
    console.error('Failed to get random mind moment:', error);
    res.status(500).json({ error: 'Failed to fetch mind moment' });
  }
}

// Upload CSV file
export async function uploadCSV(req, res) {
  try {
    const { type, filename, content } = req.body;
    
    if (!['music', 'texture'].includes(type)) {
      return res.status(400).json({ error: 'Invalid CSV type. Must be "music" or "texture"' });
    }
    
    if (!filename || !content) {
      return res.status(400).json({ error: 'Missing filename or content' });
    }
    
    const csv = await db.uploadCSV(type, filename, content);
    res.json({ csv });
  } catch (error) {
    console.error('Failed to upload CSV:', error);
    res.status(500).json({ error: 'Failed to upload CSV' });
  }
}

// Get default CSVs
export async function getDefaultCSVs(req, res) {
  try {
    const csvs = await db.getDefaultCSVs();
    res.json(csvs);
  } catch (error) {
    console.error('Failed to get default CSVs:', error);
    res.status(500).json({ error: 'Failed to load default CSVs' });
  }
}

// Get active CSVs (system-wide)
export async function getActiveCSVs(req, res) {
  try {
    const csvs = await db.getActiveCSVs();
    res.json(csvs);
  } catch (error) {
    console.error('Failed to get active CSVs:', error);
    res.status(500).json({ error: 'Failed to load active CSVs' });
  }
}

// Get single CSV by ID (kept for compatibility)
export async function getCSVById(req, res) {
  try {
    const pool = getPool();
    const result = await pool.query(
      'SELECT * FROM sound_csv_files WHERE id = $1',
      [req.params.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'CSV not found' });
    }
    
    res.json({ csv: result.rows[0] });
  } catch (error) {
    console.error('Failed to get CSV:', error);
    res.status(500).json({ error: 'Failed to load CSV' });
  }
}

