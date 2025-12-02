import { getPool } from './db/index.js';

const DREAM_CYCLE_MS = parseInt(process.env.DREAM_CYCLE_MS, 10) || 20000;
let dreamIntervalId = null;
let dreamCallback = null;

/**
 * Get a random mind moment from database with full sigil data
 * @returns {Object|null} { cycle, mindMoment, sigilCode, sigilPhrase, kinetic, lighting, sdf } or null
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
        sigil_sdf_data, sigil_sdf_width, sigil_sdf_height,
        created_at
      FROM mind_moments
      WHERE sigil_code IS NOT NULL
      ORDER BY RANDOM()
      LIMIT 1
    `);

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    
    // Convert SDF Buffer to format expected by sigil callback
    let sdf = null;
    if (row.sigil_sdf_data) {
      sdf = {
        width: row.sigil_sdf_width,
        height: row.sigil_sdf_height,
        data: row.sigil_sdf_data
      };
    }

    // Parse JSONB fields (kinetic and lighting)
    const kinetic = typeof row.kinetic === 'string' ? JSON.parse(row.kinetic) : row.kinetic;
    const lighting = typeof row.lighting === 'string' ? JSON.parse(row.lighting) : row.lighting;

    return {
      cycle: row.cycle,
      mindMoment: row.mind_moment,
      sigilCode: row.sigil_code,
      sigilPhrase: row.sigil_phrase,
      kinetic,
      lighting,
      sdf
    };
  } catch (error) {
    console.error('💭 Dream error:', error.message);
    return null;
  }
}

export function startDreamLoop(mindMomentCallback, sigilCallback) {
  if (dreamIntervalId) return;

  dreamIntervalId = setInterval(async () => {
    const dream = await getRandomMindMoment();
    
    if (dream) {
      console.log(`💭 Dreaming of cycle ${dream.cycle}: "${dream.sigilPhrase}"`);
      
      // Emit mind moment first (if callback provided)
      if (mindMomentCallback) {
        mindMomentCallback(
          dream.cycle,
          dream.mindMoment,
          dream.sigilPhrase,
          dream.kinetic,
          dream.lighting
        );
      }
      
      // Then emit sigil (if callback provided)
      if (sigilCallback) {
        sigilCallback(dream.cycle, dream.sigilCode, dream.sigilPhrase, dream.sdf);
      }
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

