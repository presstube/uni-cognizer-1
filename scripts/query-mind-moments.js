import 'dotenv/config';
import { initDatabase, getPool } from '../src/db/index.js';

async function queryMindMoments() {
  try {
    initDatabase();
    
    if (!process.env.DATABASE_URL) {
      console.log('⚠️  DATABASE_URL not set - cannot query database');
      process.exit(1);
    }
    
    const pool = getPool();
    
    // Query all mind moments, ordered by cycle
    const result = await pool.query(`
      SELECT 
        id,
        cycle,
        session_id,
        mind_moment,
        sigil_phrase,
        cognizer_version,
        llm_provider,
        processing_duration_ms,
        created_at
      FROM mind_moments
      ORDER BY cycle ASC
    `);
    
    if (result.rows.length === 0) {
      console.log('📭 No mind moments found in database');
      return;
    }
    
    console.log(`\n📊 Found ${result.rows.length} mind moment(s):\n`);
    console.log('═'.repeat(80));
    
    result.rows.forEach((row, index) => {
      console.log(`\n[${index + 1}] Cycle #${row.cycle} (Session: ${row.session_id})`);
      console.log(`    ID: ${row.id.substring(0, 8)}...`);
      console.log(`    Mind Moment: ${row.mind_moment}`);
      if (row.sigil_phrase) {
        console.log(`    Sigil Phrase: "${row.sigil_phrase}"`);
      }
      console.log(`    Provider: ${row.llm_provider || 'N/A'}`);
      console.log(`    Version: ${row.cognizer_version || 'N/A'}`);
      if (row.processing_duration_ms) {
        console.log(`    Duration: ${row.processing_duration_ms}ms`);
      }
      console.log(`    Created: ${row.created_at}`);
      if (index < result.rows.length - 1) {
        console.log('─'.repeat(80));
      }
    });
    
    console.log('\n' + '═'.repeat(80));
    console.log(`\n✓ Query complete\n`);
    
  } catch (error) {
    console.error('❌ Error querying mind moments:', error.message);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

queryMindMoments();

