import 'dotenv/config';
import { initDatabase, getPool } from '../src/db/index.js';

async function backfillSDFs() {
  initDatabase();
  const pool = getPool();
  
  const dryRun = process.argv[2] !== '--confirm';
  
  console.log('\n🎨 SDF BACKFILL - Regenerating ALL SDFs at 512×512 resolution\n');
  console.log('═'.repeat(80));
  
  try {
    // Find ALL moments with sigil_code (will overwrite existing SDFs)
    const needsSDF = await pool.query(`
      SELECT id, cycle, sigil_code, sigil_phrase
      FROM mind_moments
      WHERE sigil_code IS NOT NULL
      ORDER BY cycle ASC
    `);
    
    console.log(`\n📊 Found ${needsSDF.rows.length} mind moments to regenerate\n`);
    
    if (needsSDF.rows.length === 0) {
      console.log('✓ No mind moments with sigil_code found!\n');
      await pool.end();
      process.exit(0);
    }
    
    console.log(`Sample moments to process:`);
    needsSDF.rows.slice(0, 10).forEach(row => {
      console.log(`   Cycle ${row.cycle}: "${row.sigil_phrase || 'N/A'}" (${row.sigil_code.length} chars)`);
    });
    if (needsSDF.rows.length > 10) {
      console.log(`   ... and ${needsSDF.rows.length - 10} more`);
    }
    
    console.log('\n' + '═'.repeat(80));
    
    if (dryRun) {
    console.log('\n❌ DRY RUN - No SDFs will be regenerated\n');
    console.log('To actually regenerate ALL SDFs at 512×512 resolution, run:');
    console.log('  node scripts/backfill-sdfs.js --confirm\n');
    console.log('⚠️  Note: This will OVERWRITE existing SDFs');
    console.log('⚠️  Estimated time: ' + Math.ceil(needsSDF.rows.length * 0.5) + ' seconds\n');
      console.log('═'.repeat(80) + '\n');
      await pool.end();
      process.exit(0);
    }
    
    console.log('\n✅ CONFIRMED - Regenerating ALL SDFs at 512×512 resolution...\n');
    
    // Import the SDF generator
    const { canvasToSDF } = await import('../src/sigil/canvas-to-sdf.js');
    
    let successCount = 0;
    let failCount = 0;
    const startTime = Date.now();
    
    for (let i = 0; i < needsSDF.rows.length; i++) {
      const row = needsSDF.rows[i];
      const progress = `[${i + 1}/${needsSDF.rows.length}]`;
      
      try {
        // Generate SDF from canvas code at 512×512 resolution
        const sigilSDF = await canvasToSDF(row.sigil_code, {
          width: 512,
          height: 512,
          canvasWidth: 100,
          canvasHeight: 100,
          strokeWidth: 2,
          scale: 0.75  // Scale down to prevent gradient cutoff
        });
        
        // Update the database
        await pool.query(`
          UPDATE mind_moments
          SET sigil_sdf_data = $1,
              sigil_sdf_width = $2,
              sigil_sdf_height = $3
          WHERE id = $4
        `, [sigilSDF.data, sigilSDF.width, sigilSDF.height, row.id]);
        
        successCount++;
        console.log(`${progress} ✓ Cycle ${row.cycle}: Generated ${sigilSDF.width}×${sigilSDF.height} SDF (${sigilSDF.data.length} bytes)`);
        
      } catch (error) {
        failCount++;
        console.error(`${progress} ✗ Cycle ${row.cycle}: Failed - ${error.message}`);
      }
    }
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    
    console.log('\n' + '═'.repeat(80));
    console.log('\n✅ SDF REGENERATION COMPLETE!\n');
    console.log(`Summary:`);
    console.log(`   - ${successCount} SDFs regenerated successfully (512×512)`);
    console.log(`   - ${failCount} failures`);
    console.log(`   - Duration: ${duration}s`);
    console.log(`   - Average: ${(duration / needsSDF.rows.length).toFixed(2)}s per SDF\n`);
    
    // Show final stats
    const finalStats = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(sigil_code) as with_code,
        COUNT(sigil_sdf_data) as with_sdf
      FROM mind_moments
    `);
    
    const sdfCoverage = finalStats.rows[0].with_code > 0 
      ? ((finalStats.rows[0].with_sdf / finalStats.rows[0].with_code) * 100).toFixed(1)
      : 0;
    
    console.log(`Final database state:`);
    console.log(`   - Total moments: ${finalStats.rows[0].total}`);
    console.log(`   - With sigil_code: ${finalStats.rows[0].with_code}`);
    console.log(`   - With SDF: ${finalStats.rows[0].with_sdf}`);
    console.log(`   - SDF coverage: ${sdfCoverage}%\n`);
    
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

backfillSDFs();

