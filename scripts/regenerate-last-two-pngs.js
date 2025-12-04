import 'dotenv/config';
import { initDatabase, getPool } from '../src/db/index.js';
import { canvasToPNG } from '../src/sigil/canvas-to-png.js';

async function regenerateLastTwo() {
  initDatabase();
  const pool = getPool();
  
  console.log('\n🎨 Regenerating PNGs for last 2 mind moments\n');
  console.log('═'.repeat(60));
  
  try {
    // Get last 2 moments with sigil_code
    const result = await pool.query(`
      SELECT id, cycle, sigil_code, sigil_phrase
      FROM mind_moments
      WHERE sigil_code IS NOT NULL
      ORDER BY created_at DESC
      LIMIT 2
    `);
    
    if (result.rows.length === 0) {
      console.log('❌ No moments with sigil_code found');
      await pool.end();
      process.exit(1);
    }
    
    console.log(`\nFound ${result.rows.length} moments:\n`);
    result.rows.forEach(row => {
      console.log(`  Cycle ${row.cycle}: "${row.sigil_phrase}"`);
    });
    console.log('\n' + '═'.repeat(60) + '\n');
    
    for (const row of result.rows) {
      try {
        console.log(`Regenerating Cycle ${row.cycle}...`);
        
        const sigilPNG = await canvasToPNG(row.sigil_code, {
          width: 512,
          height: 512,
          canvasWidth: 100,
          canvasHeight: 100,
          strokeWidth: 1.0,  // Updated from 2.0
          scale: 0.75
        });
        
        await pool.query(`
          UPDATE mind_moments
          SET sigil_png_data = $1,
              sigil_png_width = $2,
              sigil_png_height = $3
          WHERE id = $4
        `, [sigilPNG.data, sigilPNG.width, sigilPNG.height, row.id]);
        
        console.log(`✓ Cycle ${row.cycle}: ${sigilPNG.width}×${sigilPNG.height} (${(sigilPNG.data.length/1024).toFixed(1)}KB) - strokeWidth: 1.0\n`);
        
      } catch (error) {
        console.error(`✗ Cycle ${row.cycle}: ${error.message}\n`);
      }
    }
    
    console.log('═'.repeat(60));
    console.log('\n✅ Complete! Refresh your dashboard to see the updated PNGs.\n');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

regenerateLastTwo();

