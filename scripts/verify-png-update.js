import 'dotenv/config';
import { initDatabase, getPool } from '../src/db/index.js';

async function verifyPNGUpdate() {
  initDatabase();
  const pool = getPool();
  
  try {
    // Check the last 2 moments
    const result = await pool.query(`
      SELECT 
        cycle,
        sigil_phrase,
        length(sigil_png_data) as png_size,
        sigil_png_width,
        sigil_png_height,
        encode(substring(sigil_png_data from 1 for 50), 'hex') as png_header
      FROM mind_moments
      WHERE sigil_code IS NOT NULL
      ORDER BY created_at DESC
      LIMIT 2
    `);
    
    console.log('\n📊 Current PNG Data in Database:\n');
    result.rows.forEach(row => {
      console.log(`Cycle ${row.cycle}: "${row.sigil_phrase}"`);
      console.log(`  Size: ${(row.png_size / 1024).toFixed(1)} KB`);
      console.log(`  Dimensions: ${row.sigil_png_width}×${row.sigil_png_height}`);
      console.log(`  Header (first 50 bytes): ${row.png_header.substring(0, 40)}...`);
      console.log('');
    });
    
    // Also check if there are multiple versions (shouldn't be, but checking)
    const allResult = await pool.query(`
      SELECT 
        count(*) as total,
        count(DISTINCT length(sigil_png_data)) as unique_sizes
      FROM mind_moments
      WHERE sigil_png_data IS NOT NULL
    `);
    
    console.log(`Total moments with PNG: ${allResult.rows[0].total}`);
    console.log(`Unique PNG sizes: ${allResult.rows[0].unique_sizes}`);
    console.log('');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

verifyPNGUpdate();

