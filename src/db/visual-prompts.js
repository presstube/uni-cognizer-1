import { getPool } from './index.js';

/**
 * Get all visual prompts
 */
export async function getAllVisualPrompts() {
  const pool = getPool();
  const result = await pool.query(
    'SELECT * FROM visual_prompts ORDER BY created_at DESC'
  );
  return result.rows;
}

/**
 * Get visual prompt by ID
 */
export async function getVisualPromptById(id) {
  const pool = getPool();
  const result = await pool.query(
    'SELECT * FROM visual_prompts WHERE id = $1',
    [id]
  );
  return result.rows[0];
}

/**
 * Get active visual prompt
 */
export async function getActiveVisualPrompt() {
  const pool = getPool();
  const result = await pool.query(
    'SELECT * FROM visual_prompts WHERE active = true LIMIT 1'
  );
  return result.rows[0];
}

/**
 * Create a new visual prompt
 */
export async function createVisualPrompt(name, slug, systemPrompt, userPrompt) {
  const pool = getPool();
  const result = await pool.query(
    `INSERT INTO visual_prompts (name, slug, system_prompt, user_prompt)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [name, slug, systemPrompt, userPrompt]
  );
  return result.rows[0];
}

/**
 * Update an existing visual prompt
 */
export async function updateVisualPrompt(id, name, slug, systemPrompt, userPrompt) {
  const pool = getPool();
  const result = await pool.query(
    `UPDATE visual_prompts
     SET name = $2, slug = $3, system_prompt = $4, user_prompt = $5, updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [id, name, slug, systemPrompt, userPrompt]
  );
  return result.rows[0];
}

/**
 * Set a visual prompt as active (and deactivate all others)
 */
export async function activateVisualPrompt(id) {
  const pool = getPool();
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Deactivate all
    await client.query('UPDATE visual_prompts SET active = false');
    
    // Activate target
    const result = await client.query(
      'UPDATE visual_prompts SET active = true WHERE id = $1 RETURNING *',
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
 * Delete a visual prompt
 */
export async function deleteVisualPrompt(id) {
  const pool = getPool();
  await pool.query('DELETE FROM visual_prompts WHERE id = $1', [id]);
  return true;
}
