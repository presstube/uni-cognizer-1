import 'dotenv/config';
import { initDatabase, getPool } from '../src/db/index.js';

async function checkPNG() {
  initDatabase();
  const pool = getPool();
  
  try {
    // Check the specific moment from the log
    const result = await pool.query(`
      SELECT 
        id,
        cycle,
        sigil_phrase,
        sigil_code IS NOT NULL as has_code,
        sigil_png_data IS NOT NULL as has_png,
        sigil_png_width,
        sigil_png_height,
        length(sigil_png_data) as png_size_bytes
      FROM mind_moments
      WHERE id::text LIKE '18eca534%'
      ORDER BY created_at DESC
      LIMIT 1
    `);
    
    if (result.rows.length === 0) {
      console.log('❌ No moment found with ID starting with 18eca534');
      await pool.end();
      process.exit(1);
    }
    
    const row = result.rows[0];
    console.log('\n📊 Mind Moment PNG Status:\n');
    console.log(`ID: ${row.id}`);
    console.log(`Cycle: ${row.cycle}`);
    console.log(`Phrase: "${row.sigil_phrase}"`);
    console.log(`Has Code: ${row.has_code ? '✓' : '✗'}`);
    console.log(`Has PNG: ${row.has_png ? '✓' : '✗'}`);
    console.log(`PNG Width: ${row.sigil_png_width || 'NULL'}`);
    console.log(`PNG Height: ${row.sigil_png_height || 'NULL'}`);
    console.log(`PNG Size: ${row.png_size_bytes ? `${(row.png_size_bytes / 1024).toFixed(1)} KB` : 'NULL'}`);
    console.log('');
    
    // Also check recent moments with PNG data
    const recentResult = await pool.query(`
      SELECT 
        cycle,
        sigil_phrase,
        sigil_png_data IS NOT NULL as has_png,
        length(sigil_png_data) as png_size
      FROM mind_moments
      WHERE sigil_png_data IS NOT NULL
      ORDER BY created_at DESC
      LIMIT 5
    `);
    
    console.log('Recent moments with PNG data:');
    if (recentResult.rows.length === 0) {
      console.log('  (none)');
    } else {
      recentResult.rows.forEach(r => {
        console.log(`  Cycle ${r.cycle}: "${r.sigil_phrase}" - ${(r.png_size / 1024).toFixed(1)} KB`);
      });
    }
    console.log('');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

checkPNG();

