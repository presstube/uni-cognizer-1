import 'dotenv/config';
import { initDatabase, getPool } from '../src/db/index.js';
import { canvasToPNG } from '../src/sigil/canvas-to-png.js';

async function regenerateAllFullScale() {
  initDatabase();
  const pool = getPool();
  
  console.log('\n🎨 Regenerating ALL PNGs at FULL SCALE (1.0)\n');
  console.log('═'.repeat(80));
  
  try {
    const result = await pool.query(`
      SELECT id, cycle, sigil_code, sigil_phrase
      FROM mind_moments
      WHERE sigil_code IS NOT NULL
      ORDER BY cycle ASC
    `);
    
    console.log(`\n📊 Found ${result.rows.length} mind moments to regenerate\n`);
    console.log('═'.repeat(80) + '\n');
    
    let successCount = 0;
    let failCount = 0;
    const startTime = Date.now();
    
    for (let i = 0; i < result.rows.length; i++) {
      const row = result.rows[i];
      const progress = `[${i + 1}/${result.rows.length}]`;
      
      try {
        const sigilPNG = await canvasToPNG(row.sigil_code, {
          width: 512,
          height: 512,
          canvasWidth: 100,
          canvasHeight: 100,
          strokeWidth: 1.0,
          scale: 1.0  // FULL SCALE
        });
        
        await pool.query(`
          UPDATE mind_moments
          SET sigil_png_data = $1,
              sigil_png_width = $2,
              sigil_png_height = $3
          WHERE id = $4
        `, [sigilPNG.data, sigilPNG.width, sigilPNG.height, row.id]);
        
        successCount++;
        console.log(`${progress} ✓ Cycle ${row.cycle}: ${sigilPNG.width}×${sigilPNG.height} (${(sigilPNG.data.length/1024).toFixed(1)}KB)`);
        
      } catch (error) {
        failCount++;
        console.error(`${progress} ✗ Cycle ${row.cycle}: ${error.message}`);
      }
    }
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    
    console.log('\n' + '═'.repeat(80));
    console.log('\n✅ FULL SCALE REGENERATION COMPLETE!\n');
    console.log(`Summary:`);
    console.log(`   - ${successCount} PNGs regenerated (scale: 1.0, strokeWidth: 1.0)`);
    console.log(`   - ${failCount} failures`);
    console.log(`   - Duration: ${duration}s`);
    console.log(`   - Average: ${(duration / result.rows.length).toFixed(2)}s per PNG\n`);
    console.log('═'.repeat(80) + '\n');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

regenerateAllFullScale();

