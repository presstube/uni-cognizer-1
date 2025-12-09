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
        mm.id,
        mm.cycle,
        mm.mind_moment,
        mm.sigil_phrase,
        mm.sigil_code,
        mm.circumplex,
        mm.visual_percepts,
        mm.audio_percepts,
        mm.prior_moment_ids,
        mm.sound_brief,
        mm.created_at,
        p.name AS personality_name,
        sp.name AS sigil_prompt_name
      FROM mind_moments mm
      LEFT JOIN personalities p ON mm.personality_id = p.id
      LEFT JOIN sigil_prompts sp ON mm.sigil_prompt_id = sp.id
      WHERE mm.session_id = 'uni'
      ORDER BY mm.cycle DESC
      LIMIT $1
    `, [limit]);
    
    res.json({ moments: result.rows });
  } catch (error) {
    console.error('Error fetching recent mind moments:', error);
    res.status(500).json({ error: 'Failed to fetch mind moments' });
  }
});

/**
 * Get ALL mind moments (entire history)
 * GET /api/mind-moments/all
 */
router.get('/mind-moments/all', async (req, res) => {
  if (process.env.DATABASE_ENABLED !== 'true') {
    return res.json({ moments: [] });
  }
  
  try {
    const pool = getPool();
    const result = await pool.query(`
      SELECT 
        mm.id,
        mm.cycle,
        mm.mind_moment,
        mm.sigil_phrase,
        mm.sigil_code,
        mm.circumplex,
        mm.visual_percepts,
        mm.audio_percepts,
        mm.prior_moment_ids,
        mm.sound_brief,
        mm.created_at,
        p.name AS personality_name,
        sp.name AS sigil_prompt_name
      FROM mind_moments mm
      LEFT JOIN personalities p ON mm.personality_id = p.id
      LEFT JOIN sigil_prompts sp ON mm.sigil_prompt_id = sp.id
      WHERE mm.session_id = 'uni'
      ORDER BY mm.cycle DESC
    `);
    
    res.json({ 
      moments: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching all mind moments:', error);
    res.status(500).json({ error: 'Failed to fetch mind moments' });
  }
});

/**
 * Get minimal mind moments for grid display (lightweight)
 * GET /api/mind-moments/grid
 */
router.get('/mind-moments/grid', async (req, res) => {
  if (process.env.DATABASE_ENABLED !== 'true') {
    return res.json({ moments: [] });
  }
  
  try {
    const pool = getPool();
    const result = await pool.query(`
      SELECT 
        mm.id,
        mm.cycle,
        mm.sigil_code
      FROM mind_moments mm
      WHERE mm.session_id = 'uni'
      ORDER BY mm.cycle DESC
    `);
    
    res.json({ 
      moments: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching mind moments grid:', error);
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
        mm.id,
        mm.cycle,
        mm.mind_moment,
        mm.sigil_phrase,
        mm.sigil_code,
        mm.circumplex,
        mm.visual_percepts,
        mm.audio_percepts,
        mm.prior_moment_ids,
        mm.sound_brief,
        mm.created_at,
        p.name AS personality_name,
        sp.name AS sigil_prompt_name
      FROM mind_moments mm
      LEFT JOIN personalities p ON mm.personality_id = p.id
      LEFT JOIN sigil_prompts sp ON mm.sigil_prompt_id = sp.id
      WHERE mm.id = $1
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

