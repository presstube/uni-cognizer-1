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
 * @param {boolean} includeImage - Whether to include reference image (default: true)
 * @param {string|null} referenceImagePath - Custom reference image path (optional)
 * @returns {Promise<Object>} Created prompt
 */
export async function createSigilPrompt(
  name, 
  slug, 
  prompt, 
  llmSettings = null, 
  includeImage = true, 
  referenceImagePath = null
) {
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
    `INSERT INTO sigil_prompts (name, slug, prompt, llm_settings, active, include_image, reference_image_path) 
     VALUES ($1, $2, $3, $4, false, $5, $6) 
     RETURNING *`,
    [name, slug, prompt, JSON.stringify(settings), includeImage, referenceImagePath]
  );
  return result.rows[0];
}

/**
 * Update existing sigil prompt
 * @param {string} id - Prompt UUID
 * @param {Object} updates - Fields to update
 * @param {string} [updates.name] - Prompt name
 * @param {string} [updates.slug] - URL-safe slug
 * @param {string} [updates.prompt] - Prompt template text
 * @param {Object} [updates.llmSettings] - LLM configuration
 * @param {boolean} [updates.includeImage] - Whether to include reference image
 * @param {string|null} [updates.referenceImagePath] - Custom reference image path
 * @returns {Promise<Object>} Updated prompt
 */
export async function updateSigilPrompt(id, updates) {
  const pool = getPool();
  
  const { name, slug, prompt, llmSettings, includeImage, referenceImagePath } = updates;
  
  const setClauses = [];
  const values = [];
  let paramIndex = 1;
  
  if (name !== undefined) {
    setClauses.push(`name = $${paramIndex++}`);
    values.push(name);
  }
  
  if (slug !== undefined) {
    setClauses.push(`slug = $${paramIndex++}`);
    values.push(slug);
  }
  
  if (prompt !== undefined) {
    setClauses.push(`prompt = $${paramIndex++}`);
    values.push(prompt);
  }
  
  if (llmSettings !== undefined) {
    setClauses.push(`llm_settings = $${paramIndex++}`);
    values.push(JSON.stringify(llmSettings));
  }
  
  if (includeImage !== undefined) {
    setClauses.push(`include_image = $${paramIndex++}`);
    values.push(includeImage);
  }
  
  if (referenceImagePath !== undefined) {
    setClauses.push(`reference_image_path = $${paramIndex++}`);
    values.push(referenceImagePath);
  }
  
  if (setClauses.length === 0) {
    // No updates, just return current
    return getSigilPromptById(id);
  }
  
  setClauses.push('updated_at = NOW()');
  values.push(id);
  
  const query = `UPDATE sigil_prompts 
     SET ${setClauses.join(', ')} 
     WHERE id = $${paramIndex} 
     RETURNING *`;
  
  const result = await pool.query(query, values);
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

