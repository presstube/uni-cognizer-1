import 'dotenv/config';
import { initDatabase, getPool } from '../src/db/index.js';

async function inspectPercepts() {
  try {
    initDatabase();
    
    if (!process.env.DATABASE_URL) {
      console.log('⚠️  DATABASE_URL not set - cannot query database');
      process.exit(1);
    }
    
    const pool = getPool();
    
    // Query recent mind moments with percepts
    const result = await pool.query(`
      SELECT 
        cycle,
        visual_percepts,
        audio_percepts
      FROM mind_moments
      WHERE jsonb_array_length(visual_percepts) > 0 
         OR jsonb_array_length(audio_percepts) > 0
      ORDER BY cycle DESC
      LIMIT 3
    `);
    
    if (result.rows.length === 0) {
      console.log('📭 No mind moments with percepts found');
      return;
    }
    
    console.log(`\n📊 Found ${result.rows.length} mind moment(s) with percepts:\n`);
    console.log('═'.repeat(80));
    
    result.rows.forEach((row, index) => {
      console.log(`\n[${index + 1}] CYCLE #${row.cycle}`);
      console.log('\n--- VISUAL PERCEPTS ---');
      console.log(JSON.stringify(row.visual_percepts, null, 2));
      console.log('\n--- AUDIO PERCEPTS ---');
      console.log(JSON.stringify(row.audio_percepts, null, 2));
      
      if (index < result.rows.length - 1) {
        console.log('\n' + '─'.repeat(80));
      }
    });
    
    console.log('\n' + '═'.repeat(80));
    console.log(`\n✓ Inspection complete\n`);
    
  } catch (error) {
    console.error('❌ Error inspecting percepts:', error.message);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

inspectPercepts();
