import { Router } from 'express';
import { getPool } from '../db/index.js';

const router = Router();

/**
 * Get recent mind moments for history display
 * GET /api/mind-moments/recent?limit=100
 */
router.get('/mind-moments/recent', async (req, res) => {
  const limit = parseInt(req.query.limit, 10) || 100;
  
  if (process.env.DATABASE_ENABLED !== 'true') {
    return res.json({ moments: [] });
  }
  
  try {
    const pool = getPool();
    const result = await pool.query(`
      SELECT 
        id,
        cycle,
        mind_moment,
        sigil_phrase,
        sigil_code,
        kinetic,
        lighting,
        visual_percepts,
        audio_percepts,
        prior_moment_ids,
        created_at
      FROM mind_moments
      WHERE session_id = 'uni'
      ORDER BY cycle DESC
      LIMIT $1
    `, [limit]);
    
    res.json({ moments: result.rows });
  } catch (error) {
    console.error('Error fetching recent mind moments:', error);
    res.status(500).json({ error: 'Failed to fetch mind moments' });
  }
});

/**
 * Get a specific mind moment by ID
 * GET /api/mind-moments/:id
 */
router.get('/mind-moments/:id', async (req, res) => {
  const { id } = req.params;
  
  if (process.env.DATABASE_ENABLED !== 'true') {
    return res.status(404).json({ error: 'Database not enabled' });
  }
  
  try {
    const pool = getPool();
    const result = await pool.query(`
      SELECT 
        id,
        cycle,
        mind_moment,
        sigil_phrase,
        sigil_code,
        kinetic,
        lighting,
        visual_percepts,
        audio_percepts,
        prior_moment_ids,
        created_at
      FROM mind_moments
      WHERE id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Mind moment not found' });
    }
    
    res.json({ moment: result.rows[0] });
  } catch (error) {
    console.error('Error fetching mind moment:', error);
    res.status(500).json({ error: 'Failed to fetch mind moment' });
  }
});

export default router;

