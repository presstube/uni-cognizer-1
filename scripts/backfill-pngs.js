import 'dotenv/config';
import { initDatabase, getPool } from '../src/db/index.js';
import { canvasToPNG } from '../src/sigil/canvas-to-png.js';

async function backfillPNGs() {
  initDatabase();
  const pool = getPool();
  
  const dryRun = process.argv[2] !== '--confirm';
  
  console.log('\n🎨 PNG BACKFILL - Generating transparent PNGs for all sigils\n');
  console.log('═'.repeat(80));
  
  try {
    // Find all moments with sigil_code
    const needsPNG = await pool.query(`
      SELECT id, cycle, sigil_code, sigil_phrase
      FROM mind_moments
      WHERE sigil_code IS NOT NULL
      ORDER BY cycle ASC
    `);
    
    console.log(`\n📊 Found ${needsPNG.rows.length} mind moments to process\n`);
    
    if (needsPNG.rows.length === 0) {
      console.log('✓ No mind moments with sigil_code found!\n');
      await pool.end();
      process.exit(0);
    }
    
    console.log(`Sample moments:`);
    needsPNG.rows.slice(0, 10).forEach(row => {
      console.log(`   Cycle ${row.cycle}: "${row.sigil_phrase || 'N/A'}"`);
    });
    if (needsPNG.rows.length > 10) {
      console.log(`   ... and ${needsPNG.rows.length - 10} more`);
    }
    
    console.log('\n' + '═'.repeat(80));
    
    if (dryRun) {
      console.log('\n❌ DRY RUN - No PNGs will be generated\n');
      console.log('To actually generate all PNGs, run:');
      console.log('  node scripts/backfill-pngs.js --confirm\n');
      console.log(`⚠️  Estimated time: ~${Math.ceil(needsPNG.rows.length * 0.3)}s\n`);
      console.log('═'.repeat(80) + '\n');
      await pool.end();
      process.exit(0);
    }
    
    console.log('\n✅ CONFIRMED - Generating 512×512 transparent PNGs...\n');
    
    let successCount = 0;
    let failCount = 0;
    const startTime = Date.now();
    
    for (let i = 0; i < needsPNG.rows.length; i++) {
      const row = needsPNG.rows[i];
      const progress = `[${i + 1}/${needsPNG.rows.length}]`;
      
      try {
        const sigilPNG = await canvasToPNG(row.sigil_code, {
          width: 512,
          height: 512,
          canvasWidth: 100,
          canvasHeight: 100,
          strokeWidth: 2,
          scale: 0.75
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
    console.log('\n✅ PNG GENERATION COMPLETE!\n');
    console.log(`Summary:`);
    console.log(`   - ${successCount} PNGs generated`);
    console.log(`   - ${failCount} failures`);
    console.log(`   - Duration: ${duration}s`);
    console.log(`   - Average: ${(duration / needsPNG.rows.length).toFixed(2)}s per PNG\n`);
    
    const finalStats = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(sigil_code) as with_code,
        COUNT(sigil_png_data) as with_png
      FROM mind_moments
    `);
    
    const pngCoverage = finalStats.rows[0].with_code > 0 
      ? ((finalStats.rows[0].with_png / finalStats.rows[0].with_code) * 100).toFixed(1)
      : 0;
    
    console.log(`Database state:`);
    console.log(`   - Total moments: ${finalStats.rows[0].total}`);
    console.log(`   - With sigil_code: ${finalStats.rows[0].with_code}`);
    console.log(`   - With PNG: ${finalStats.rows[0].with_png}`);
    console.log(`   - PNG coverage: ${pngCoverage}%\n`);
    
    console.log('═'.repeat(80) + '\n');
    
  } catch (error) {
    console.error('\n❌ Error during backfill:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

backfillPNGs();

