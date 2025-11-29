import { getPool } from './index.js';

/**
 * Repository for personality management
 * Handles CRUD operations for personality prompts
 */

// Get currently active personality
export async function getActivePersonality() {
  const pool = getPool();
  
  try {
    const result = await pool.query(
      'SELECT * FROM personalities WHERE active = true'
    );
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error fetching active personality:', error.message);
    return null;
  }
}

// Get personality by ID
export async function getPersonalityById(id) {
  const pool = getPool();
  
  const result = await pool.query(
    'SELECT * FROM personalities WHERE id = $1',
    [id]
  );
  
  return result.rows[0] || null;
}

// List all personalities (without full prompt for efficiency)
export async function listPersonalities() {
  const pool = getPool();
  
  const result = await pool.query(`
    SELECT id, name, slug, active, created_at, updated_at 
    FROM personalities 
    ORDER BY updated_at DESC
  `);
  
  return result.rows;
}

// Get full personality with prompt
export async function getFullPersonality(id) {
  const pool = getPool();
  
  const result = await pool.query(
    'SELECT * FROM personalities WHERE id = $1',
    [id]
  );
  
  return result.rows[0] || null;
}

// Save personality (create or update)
export async function savePersonality({ 
  id, name, slug, prompt,
  provider, model, temperature, top_p, top_k, max_tokens
}) {
  const pool = getPool();
  
  if (id) {
    // Update existing
    const result = await pool.query(`
      UPDATE personalities 
      SET name = $2, slug = $3, prompt = $4,
          provider = $5, model = $6, temperature = $7,
          top_p = $8, top_k = $9, max_tokens = $10,
          updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [id, name, slug, prompt, provider, model, temperature, top_p, top_k, max_tokens]);
    
    return result.rows[0];
  } else {
    // Create new (inactive by default)
    const result = await pool.query(`
      INSERT INTO personalities (name, slug, prompt, active, provider, model, temperature, top_p, top_k, max_tokens)
      VALUES ($1, $2, $3, false, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [name, slug, prompt, provider, model, temperature, top_p, top_k, max_tokens]);
    
    return result.rows[0];
  }
}

// Activate a personality (deactivate all others)
export async function activatePersonality(id) {
  const pool = getPool();
  
  await pool.query('BEGIN');
  
  try {
    // Deactivate all
    await pool.query('UPDATE personalities SET active = false');
    
    // Activate this one
    const result = await pool.query(`
      UPDATE personalities 
      SET active = true, updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [id]);
    
    if (result.rows.length === 0) {
      throw new Error('Personality not found');
    }
    
    await pool.query('COMMIT');
    return result.rows[0];
  } catch (error) {
    await pool.query('ROLLBACK');
    throw error;
  }
}

// Delete personality (only if not active)
export async function deletePersonality(id) {
  const pool = getPool();
  
  // Check if active
  const personality = await getPersonalityById(id);
  if (personality?.active) {
    throw new Error('Cannot delete active personality. Activate another personality first.');
  }
  
  await pool.query('DELETE FROM personalities WHERE id = $1', [id]);
}

