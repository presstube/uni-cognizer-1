import { getPool } from './index.js';

export async function createSession(sessionId, metadata = {}) {
  const pool = getPool();
  
  try {
    await pool.query(`
      INSERT INTO sessions (id, metadata)
      VALUES ($1, $2)
      ON CONFLICT (id) DO NOTHING
    `, [sessionId, JSON.stringify(metadata)]);
  } catch (error) {
    console.error('Error creating session:', error.message);
  }
}

export async function updateSessionPercepts(sessionId, count) {
  const pool = getPool();
  
  try {
    await pool.query(`
      UPDATE sessions 
      SET percept_count = percept_count + $2
      WHERE id = $1
    `, [sessionId, count]);
  } catch (error) {
    console.error('Error updating session percepts:', error.message);
  }
}

export async function endSession(sessionId) {
  const pool = getPool();
  
  try {
    await pool.query(`
      UPDATE sessions 
      SET end_time = NOW()
      WHERE id = $1
    `, [sessionId]);
  } catch (error) {
    console.error('Error ending session:', error.message);
  }
}

