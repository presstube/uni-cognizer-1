import 'dotenv/config';
import { initDatabase, getPool } from '../src/db/index.js';

async function checkCycles() {
  try {
    initDatabase();
    
    if (!process.env.DATABASE_URL) {
      console.log('⚠️  DATABASE_URL not set - cannot query database');
      process.exit(1);
    }
    
    const pool = getPool();
    
    const result = await pool.query(`
      SELECT cycle, mind_moment, sigil_phrase, sigil_code,
             visual_percepts, audio_percepts,
             sigil_generation_error,
             created_at
      FROM mind_moments
      WHERE cycle IN (336, 337)
      ORDER BY cycle
    `);
    
    console.log(`Found ${result.rows.length} cycles\n`);
    
    result.rows.forEach(row => {
      console.log(`=== Cycle ${row.cycle} ===`);
      console.log(`Mind Moment: ${row.mind_moment?.substring(0, 100)}...`);
      console.log(`Sigil Phrase: ${row.sigil_phrase || 'NULL'}`);
      console.log(`Sigil Code: ${row.sigil_code ? 'EXISTS' : 'NULL'}`);
      
      let visualPercepts = [];
      let audioPercepts = [];
      
      try {
        visualPercepts = Array.isArray(row.visual_percepts) 
          ? row.visual_percepts 
          : JSON.parse(row.visual_percepts || '[]');
        audioPercepts = Array.isArray(row.audio_percepts)
          ? row.audio_percepts
          : JSON.parse(row.audio_percepts || '[]');
      } catch (e) {
        // Already objects, not JSON strings
        visualPercepts = row.visual_percepts || [];
        audioPercepts = row.audio_percepts || [];
      }
      
      console.log(`Visual Percepts: ${visualPercepts.length}`);
      console.log(`Audio Percepts: ${audioPercepts.length}`);
      console.log(`Sigil Error: ${row.sigil_generation_error || 'None'}`);
      console.log(`Created: ${row.created_at}`);
      console.log('');
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkCycles();
