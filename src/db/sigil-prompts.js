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
 * @param {Object|null} llmSettings - LLM configuration (optional)
 * @returns {Promise<Object>} Created prompt
 */
export async function createSigilPrompt(name, slug, prompt, llmSettings = null) {
  const pool = getPool();
  
  // Default LLM settings if not provided
  const defaultSettings = {
    provider: 'anthropic',
    model: 'claude-sonnet-4-5-20250929',
    temperature: 0.7,
    top_p: 0.9,
    max_tokens: 1024,
    top_k: null
  };
  
  const settings = llmSettings || defaultSettings;
  
  const result = await pool.query(
    `INSERT INTO sigil_prompts (name, slug, prompt, llm_settings, active) 
     VALUES ($1, $2, $3, $4, false) 
     RETURNING *`,
    [name, slug, prompt, JSON.stringify(settings)]
  );
  return result.rows[0];
}

/**
 * Update existing sigil prompt
 * @param {string} id - Prompt UUID
 * @param {string} name - Prompt name
 * @param {string} slug - URL-safe slug
 * @param {string} prompt - Prompt template text
 * @param {Object|null} llmSettings - LLM configuration (null = keep existing)
 * @returns {Promise<Object>} Updated prompt
 */
export async function updateSigilPrompt(id, name, slug, prompt, llmSettings = null) {
  const pool = getPool();
  
  // If llmSettings provided, update it; otherwise keep existing
  const updates = [name, slug, prompt];
  let query = `UPDATE sigil_prompts 
     SET name = $1, slug = $2, prompt = $3`;
  
  if (llmSettings !== null) {
    updates.push(JSON.stringify(llmSettings));
    query += `, llm_settings = $4`;
  }
  
  updates.push(id);
  query += `, updated_at = NOW() WHERE id = $${updates.length} RETURNING *`;
  
  const result = await pool.query(query, updates);
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

