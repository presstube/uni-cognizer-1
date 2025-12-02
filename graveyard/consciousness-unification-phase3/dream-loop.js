import { getPool } from './db/index.js';
import { normalizeMindMoment } from './types/mind-moment.js';

const DREAM_CYCLE_MS = parseInt(process.env.DREAM_CYCLE_MS, 10) || 20000;
let dreamIntervalId = null;
let dreamCallback = null;

/**
 * Get a random mind moment from database with full data including percepts
 * @returns {Object|null} Normalized mind moment or null
 */
async function getRandomMindMoment() {
  if (process.env.DATABASE_ENABLED !== 'true') {
    return null;
  }

  try {
    const pool = getPool();
    const result = await pool.query(`
      SELECT 
        cycle, mind_moment, sigil_phrase, sigil_code,
        kinetic, lighting,
        visual_percepts, audio_percepts, prior_moment_ids,
        sigil_sdf_data, sigil_sdf_width, sigil_sdf_height,
        created_at
      FROM mind_moments
      WHERE sigil_code IS NOT NULL
      ORDER BY RANDOM()
      LIMIT 1
    `);

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    
    // Convert SDF Buffer if present
    let sdf = null;
    if (row.sigil_sdf_data) {
      sdf = {
        width: row.sigil_sdf_width,
        height: row.sigil_sdf_height,
        data: row.sigil_sdf_data
      };
    }

    // Use normalization function for consistent structure
    return normalizeMindMoment({
      cycle: row.cycle,
      mind_moment: row.mind_moment,
      sigil_code: row.sigil_code,
      sigil_phrase: row.sigil_phrase,
      kinetic: row.kinetic,
      lighting: row.lighting,
      visual_percepts: row.visual_percepts,
      audio_percepts: row.audio_percepts,
      prior_moment_ids: row.prior_moment_ids,
      sdf,
      isDream: true
    });
  } catch (error) {
    console.error('💭 Dream error:', error.message);
    return null;
  }
}

export function startDreamLoop(io) {
  if (dreamIntervalId) return;

  dreamIntervalId = setInterval(async () => {
    const dream = await getRandomMindMoment();
    
    if (dream) {
      console.log(`💭 Dreaming of cycle ${dream.cycle}: "${dream.sigilPhrase}"`);
      
      // Emit mind moment with original percepts
      io.emit('mindMoment', {
        cycle: dream.cycle,
        mindMoment: dream.mindMoment,
        sigilPhrase: dream.sigilPhrase,
        kinetic: dream.kinetic,
        lighting: dream.lighting,
        visualPercepts: dream.visualPercepts,
        audioPercepts: dream.audioPercepts,
        priorMoments: dream.priorMomentIds,
        isDream: true,
        timestamp: new Date().toISOString()
      });
      
      // Emit sigil
      const sigilData = {
        cycle: dream.cycle,
        sigilCode: dream.sigilCode,
        sigilPhrase: dream.sigilPhrase,
        isDream: true,
        timestamp: new Date().toISOString()
      };
      
      if (dream.sdf && dream.sdf.data) {
        sigilData.sdf = {
          width: dream.sdf.width,
          height: dream.sdf.height,
          data: Buffer.from(dream.sdf.data).toString('base64')
        };
      }
      
      io.emit('sigil', sigilData);
    }
  }, DREAM_CYCLE_MS);

  console.log(`💭 Dream loop started (${DREAM_CYCLE_MS}ms interval)`);
}

export function stopDreamLoop() {
  if (dreamIntervalId) {
    clearInterval(dreamIntervalId);
    dreamIntervalId = null;
    console.log('💤 Dream loop stopped');
  }
}

export function isDreaming() {
  return dreamIntervalId !== null;
}

