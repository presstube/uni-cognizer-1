/**
 * Sound Prompts Database Module
 * Handles CRUD operations for sound prompts and CSV files
 */

import { getPool } from './index.js';
import fs from 'fs/promises';
import path from 'path';

// List all prompts
export async function listSoundPrompts() {
  const pool = getPool();
  const result = await pool.query(
    'SELECT * FROM sound_prompts ORDER BY updated_at DESC'
  );
  return result.rows;
}

// Get single prompt
export async function getSoundPrompt(id) {
  const pool = getPool();
  const result = await pool.query(
    'SELECT * FROM sound_prompts WHERE id = $1',
    [id]
  );
  return result.rows[0];
}

// Get active prompt
export async function getActiveSoundPrompt() {
  const pool = getPool();
  const result = await pool.query(
    'SELECT * FROM sound_prompts WHERE active = true'
  );
  return result.rows[0];
}

// Save prompt (create or update)
export async function saveSoundPrompt(data) {
  const pool = getPool();
  
  if (data.id) {
    // Update existing
    const result = await pool.query(`
      UPDATE sound_prompts 
      SET name = $1, slug = $2, prompt = $3, 
          llm_settings = $4, updated_at = NOW()
      WHERE id = $5
      RETURNING *
    `, [data.name, data.slug, data.prompt, data.llmSettings, data.id]);
    return result.rows[0];
  } else {
    // Create new
    const result = await pool.query(`
      INSERT INTO sound_prompts (name, slug, prompt, llm_settings)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [data.name, data.slug, data.prompt, data.llmSettings]);
    return result.rows[0];
  }
}

// Activate prompt
export async function activateSoundPrompt(id) {
  const pool = getPool();
  
  await pool.query('BEGIN');
  try {
    // Deactivate all
    await pool.query('UPDATE sound_prompts SET active = false');
    
    // Activate selected
    const result = await pool.query(
      'UPDATE sound_prompts SET active = true WHERE id = $1 RETURNING *',
      [id]
    );
    
    await pool.query('COMMIT');
    return result.rows[0];
  } catch (error) {
    await pool.query('ROLLBACK');
    throw error;
  }
}

// Delete prompt
export async function deleteSoundPrompt(id) {
  const pool = getPool();
  await pool.query('DELETE FROM sound_prompts WHERE id = $1', [id]);
}

// Seed default CSVs
export async function seedDefaultCSVs() {
  const pool = getPool();
  
  // Check if already seeded
  const existing = await pool.query(
    'SELECT COUNT(*) FROM sound_csv_files WHERE is_default = true'
  );
  
  if (parseInt(existing.rows[0].count) > 0) {
    console.log('✅ Default CSV files already seeded');
    return;
  }
  
  // Load from assets
  const musicPath = path.join(process.cwd(), 'assets/sound-samples/music_samples.csv');
  const texturePath = path.join(process.cwd(), 'assets/sound-samples/texture_samples.csv');
  
  const musicContent = await fs.readFile(musicPath, 'utf-8');
  const textureContent = await fs.readFile(texturePath, 'utf-8');
  
  // Insert defaults
  await pool.query(`
    INSERT INTO sound_csv_files (type, filename, content, is_default)
    VALUES 
      ('music', 'music_samples.csv', $1, true),
      ('texture', 'texture_samples.csv', $2, true)
  `, [musicContent, textureContent]);
  
  console.log('✅ Default CSV files seeded');
}

// Get default CSVs
export async function getDefaultCSVs() {
  const pool = getPool();
  const result = await pool.query(
    'SELECT * FROM sound_csv_files WHERE is_default = true'
  );
  
  return {
    music: result.rows.find(r => r.type === 'music'),
    texture: result.rows.find(r => r.type === 'texture')
  };
}

// Upload custom CSV
export async function uploadCSV(type, filename, content) {
  const pool = getPool();
  const result = await pool.query(`
    INSERT INTO sound_csv_files (type, filename, content, is_default)
    VALUES ($1, $2, $3, false)
    RETURNING *
  `, [type, filename, content]);
  return result.rows[0];
}

