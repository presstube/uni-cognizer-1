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
  llmProvider,
  processingDuration
}) {
  const pool = getPool();
  
  try {
    const result = await pool.query(`
      INSERT INTO mind_moments (
        cycle, session_id, mind_moment, sigil_phrase, sigil_code,
        kinetic, lighting, visual_percepts, audio_percepts, prior_moment_ids,
        cognizer_version, llm_provider, processing_duration_ms
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING id, created_at
    `, [
      cycle, sessionId, mindMoment, sigilPhrase, sigilCode,
      JSON.stringify(kinetic), JSON.stringify(lighting),
      JSON.stringify(visualPercepts), JSON.stringify(audioPercepts),
      priorMomentIds,
      cognizerVersion, llmProvider, processingDuration
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
      SELECT id, cycle, mind_moment, created_at
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

