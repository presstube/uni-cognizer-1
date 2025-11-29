import { getPool } from './index.js';

export async function saveMindMoment({
  cycle,
  sessionId,
  mindMoment,
  sigilPhrase,
  sigilCode,
  kinetic,
  lighting,
  visualPercepts,
  audioPercepts,
  priorMomentIds = [],
  cognizerVersion,
  personalityId,
  llmProvider,
  processingDuration
}) {
  const pool = getPool();
  
  try {
    const result = await pool.query(`
      INSERT INTO mind_moments (
        cycle, session_id, mind_moment, sigil_phrase, sigil_code,
        kinetic, lighting, visual_percepts, audio_percepts, prior_moment_ids,
        cognizer_version, personality_id, llm_provider, processing_duration_ms
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING id, created_at
    `, [
      cycle, sessionId, mindMoment, sigilPhrase, sigilCode,
      JSON.stringify(kinetic), JSON.stringify(lighting),
      JSON.stringify(visualPercepts), JSON.stringify(audioPercepts),
      priorMomentIds,
      cognizerVersion, personalityId, llmProvider, processingDuration
    ]);
    
    return result.rows[0];
  } catch (error) {
    console.error('Error saving mind moment:', error.message);
    throw error;
  }
}

export async function getPriorMindMoments(sessionId, limit = 3) {
  const pool = getPool();
  
  try {
    const result = await pool.query(`
      SELECT id, cycle, mind_moment, sigil_phrase, sigil_code, created_at
      FROM mind_moments
      WHERE session_id = $1
      ORDER BY cycle DESC
      LIMIT $2
    `, [sessionId, limit]);
    
    return result.rows;
  } catch (error) {
    console.error('Error fetching prior moments:', error.message);
    return [];
  }
}

export async function getMindMomentById(id) {
  const pool = getPool();
  
  const result = await pool.query(
    'SELECT * FROM mind_moments WHERE id = $1',
    [id]
  );
  
  return result.rows[0];
}

export async function getSessionHistory(sessionId) {
  const pool = getPool();
  
  const result = await pool.query(`
    SELECT * FROM mind_moments
    WHERE session_id = $1
    ORDER BY cycle ASC
  `, [sessionId]);
  
  return result.rows;
}

/**
 * Get mind moment with full sigil data (including SVG/SDF)
 * @param {string} momentId - UUID of mind moment
 * @returns {Object} Full moment with all sigil formats
 */
export async function getMindMomentWithFullSigil(momentId) {
  const pool = getPool();
  
  const result = await pool.query(`
    SELECT 
      id, cycle, session_id, mind_moment, sigil_phrase,
      sigil_code, sigil_svg, 
      sigil_sdf_data, sigil_sdf_width, sigil_sdf_height,
      kinetic, lighting, created_at
    FROM mind_moments 
    WHERE id = $1
  `, [momentId]);
  
  if (result.rows.length === 0) return null;
  
  const row = result.rows[0];
  
  // Convert Buffer to Uint8Array for JavaScript consumption
  if (row.sigil_sdf_data) {
    row.sigil_sdf_data = new Uint8Array(row.sigil_sdf_data);
  }
  
  return row;
}

/**
 * Get only SDF data for a moment (lightweight query)
 * @param {string} momentId - UUID of mind moment
 * @returns {Object} { sigil_sdf_data, sigil_sdf_width, sigil_sdf_height }
 */
export async function getMindMomentSDF(momentId) {
  const pool = getPool();
  
  const result = await pool.query(`
    SELECT sigil_sdf_data, sigil_sdf_width, sigil_sdf_height
    FROM mind_moments 
    WHERE id = $1
  `, [momentId]);
  
  if (result.rows.length === 0) return null;
  
  const row = result.rows[0];
  
  // Convert Buffer to Uint8Array for JavaScript consumption
  if (row.sigil_sdf_data) {
    row.sigil_sdf_data = new Uint8Array(row.sigil_sdf_data);
  }
  
  return row;
}

/**
 * Get only SVG data for a moment (lightweight query)
 * @param {string} momentId - UUID of mind moment
 * @returns {string} SVG XML string
 */
export async function getMindMomentSVG(momentId) {
  const pool = getPool();
  
  const result = await pool.query(`
    SELECT sigil_svg
    FROM mind_moments 
    WHERE id = $1
  `, [momentId]);
  
  if (result.rows.length === 0) return null;
  
  return result.rows[0].sigil_svg;
}

