// Database repository for sigil prompts

import { getPool } from './index.js';

/**
 * Get all sigil prompts
 * @returns {Promise<Array>} Array of sigil prompts
 */
export async function getAllSigilPrompts() {
  const pool = getPool();
  const result = await pool.query(
    'SELECT * FROM sigil_prompts ORDER BY updated_at DESC'
  );
  return result.rows;
}

/**
 * Get the active sigil prompt
 * @returns {Promise<Object|null>} Active prompt or null
 */
export async function getActiveSigilPrompt() {
  const pool = getPool();
  const result = await pool.query(
    'SELECT * FROM sigil_prompts WHERE active = true LIMIT 1'
  );
  return result.rows[0] || null;
}

/**
 * Get sigil prompt by ID
 * @param {string} id - Prompt UUID
 * @returns {Promise<Object|null>} Prompt or null
 */
export async function getSigilPromptById(id) {
  const pool = getPool();
  const result = await pool.query(
    'SELECT * FROM sigil_prompts WHERE id = $1',
    [id]
  );
  return result.rows[0] || null;
}

/**
 * Create a new sigil prompt
 * @param {string} name - Prompt name
 * @param {string} slug - URL-safe slug
 * @param {string} prompt - Prompt template text
 * @returns {Promise<Object>} Created prompt
 */
export async function createSigilPrompt(name, slug, prompt) {
  const pool = getPool();
  const result = await pool.query(
    `INSERT INTO sigil_prompts (name, slug, prompt, active) 
     VALUES ($1, $2, $3, false) 
     RETURNING *`,
    [name, slug, prompt]
  );
  return result.rows[0];
}

/**
 * Update existing sigil prompt
 * @param {string} id - Prompt UUID
 * @param {string} name - Prompt name
 * @param {string} slug - URL-safe slug
 * @param {string} prompt - Prompt template text
 * @returns {Promise<Object>} Updated prompt
 */
export async function updateSigilPrompt(id, name, slug, prompt) {
  const pool = getPool();
  const result = await pool.query(
    `UPDATE sigil_prompts 
     SET name = $1, slug = $2, prompt = $3, updated_at = NOW() 
     WHERE id = $4 
     RETURNING *`,
    [name, slug, prompt, id]
  );
  return result.rows[0];
}

/**
 * Activate a sigil prompt (deactivates all others)
 * @param {string} id - Prompt UUID to activate
 * @returns {Promise<Object>} Activated prompt
 */
export async function activateSigilPrompt(id) {
  const pool = getPool();
  
  await pool.query('BEGIN');
  try {
    // Deactivate all
    await pool.query('UPDATE sigil_prompts SET active = false');
    
    // Activate this one
    const result = await pool.query(
      'UPDATE sigil_prompts SET active = true WHERE id = $1 RETURNING *',
      [id]
    );
    
    await pool.query('COMMIT');
    return result.rows[0];
  } catch (error) {
    await pool.query('ROLLBACK');
    throw error;
  }
}

/**
 * Delete a sigil prompt
 * @param {string} id - Prompt UUID
 * @returns {Promise<void>}
 */
export async function deleteSigilPrompt(id) {
  const pool = getPool();
  await pool.query('DELETE FROM sigil_prompts WHERE id = $1', [id]);
}

