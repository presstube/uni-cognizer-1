import { getPool } from './index.js';

/**
 * Get all audio prompts
 */
export async function getAllAudioPrompts() {
  const pool = getPool();
  const result = await pool.query(
    'SELECT * FROM audio_prompts ORDER BY created_at DESC'
  );
  return result.rows;
}

/**
 * Get audio prompt by ID
 */
export async function getAudioPromptById(id) {
  const pool = getPool();
  const result = await pool.query(
    'SELECT * FROM audio_prompts WHERE id = $1',
    [id]
  );
  return result.rows[0];
}

/**
 * Get active audio prompt
 */
export async function getActiveAudioPrompt() {
  const pool = getPool();
  const result = await pool.query(
    'SELECT * FROM audio_prompts WHERE active = true LIMIT 1'
  );
  return result.rows[0];
}

/**
 * Create a new audio prompt
 */
export async function createAudioPrompt(name, slug, systemPrompt, userPrompt, generationConfig = {}) {
  const pool = getPool();
  const result = await pool.query(
    `INSERT INTO audio_prompts (name, slug, system_prompt, user_prompt, temperature, top_p, top_k, max_output_tokens)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      name, 
      slug, 
      systemPrompt, 
      userPrompt,
      generationConfig.temperature ?? 0.8,
      generationConfig.topP ?? 0.9,
      generationConfig.topK ?? 40,
      generationConfig.maxOutputTokens ?? 1024
    ]
  );
  return result.rows[0];
}

/**
 * Update an existing audio prompt
 */
export async function updateAudioPrompt(id, name, slug, systemPrompt, userPrompt, generationConfig = {}) {
  const pool = getPool();
  const result = await pool.query(
    `UPDATE audio_prompts 
     SET name = $2, slug = $3, system_prompt = $4, user_prompt = $5, 
         temperature = $6, top_p = $7, top_k = $8, max_output_tokens = $9,
         updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [
      id, 
      name, 
      slug, 
      systemPrompt, 
      userPrompt,
      generationConfig.temperature ?? 0.8,
      generationConfig.topP ?? 0.9,
      generationConfig.topK ?? 40,
      generationConfig.maxOutputTokens ?? 1024
    ]
  );
  return result.rows[0];
}

/**
 * Set an audio prompt as active (and deactivate all others)
 */
export async function activateAudioPrompt(id) {
  const pool = getPool();
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Deactivate all
    await client.query('UPDATE audio_prompts SET active = false');
    
    // Activate target
    const result = await client.query(
      'UPDATE audio_prompts SET active = true WHERE id = $1 RETURNING *',
      [id]
    );
    
    await client.query('COMMIT');
    return result.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Delete an audio prompt
 */
export async function deleteAudioPrompt(id) {
  const pool = getPool();
  await pool.query('DELETE FROM audio_prompts WHERE id = $1', [id]);
  return true;
}

