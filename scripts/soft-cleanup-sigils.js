import 'dotenv/config';
import { initDatabase, getPool } from '../src/db/index.js';

async function softCleanup() {
  initDatabase();
  const pool = getPool();
  
  const confirmDelete = process.argv[2] === '--confirm';
  
  console.log('\n🧹 SOFT CLEANUP - Removing moments without sigils\n');
  console.log('═'.repeat(80));
  
  try {
    // Get the moments without sigils (targets for deletion)
    const noSigils = await pool.query(`
      SELECT id, cycle, session_id, mind_moment, sigil_phrase
      FROM mind_moments
      WHERE sigil_code IS NULL
      ORDER BY cycle ASC
    `);
    
    const targetIds = noSigils.rows.map(r => r.id);
    const targetCycles = noSigils.rows.map(r => r.cycle);
    
    console.log(`\n🎯 Moments to DELETE: ${noSigils.rows.length}`);
    noSigils.rows.forEach(row => {
      console.log(`   Cycle ${row.cycle}: "${row.sigil_phrase || 'N/A'}"`);
    });
    
    // Find moments that need their prior_moment_ids cleaned up
    const referencingMoments = await pool.query(`
      SELECT 
        id, 
        cycle, 
        sigil_phrase,
        prior_moment_ids,
        (
          SELECT array_agg(mm2.cycle ORDER BY mm2.cycle)
          FROM mind_moments mm2
          WHERE mm2.id = ANY(mind_moments.prior_moment_ids)
          AND mm2.sigil_code IS NULL
        ) as references_deleted_cycles
      FROM mind_moments
      WHERE EXISTS (
        SELECT 1 
        FROM unnest(prior_moment_ids) AS pid
        WHERE pid = ANY($1::uuid[])
      )
      ORDER BY cycle
    `, [targetIds]);
    
    console.log(`\n🔗 Moments to CLEAN UP (remove orphaned refs): ${referencingMoments.rows.length}`);
    referencingMoments.rows.forEach(row => {
      const deletedRefs = row.references_deleted_cycles || [];
      const totalPriors = row.prior_moment_ids.length;
      console.log(`   Cycle ${row.cycle}: removing ${deletedRefs.length}/${totalPriors} refs (cycles ${deletedRefs.join(', ')})`);
    });
    
    console.log('\n' + '═'.repeat(80));
    console.log('\n⚠️  This will:');
    console.log(`   1. DELETE ${noSigils.rows.length} mind moments without sigils`);
    console.log(`   2. CLEAN UP ${referencingMoments.rows.length} moments by removing orphaned references`);
    console.log(`   3. Keep all other moments intact\n`);
    
    if (!confirmDelete) {
      console.log('❌ NOT CONFIRMED - This is a dry run\n');
      console.log('To actually perform the cleanup, run:');
      console.log('  node scripts/soft-cleanup-sigils.js --confirm\n');
      console.log('═'.repeat(80) + '\n');
      await pool.end();
      process.exit(0);
    }
    
    console.log('✅ CONFIRMED - Starting cleanup...\n');
    
    // Begin transaction
    await pool.query('BEGIN');
    
    try {
      // Step 1: Clean up prior_moment_ids in referencing moments
      console.log('📝 Step 1: Cleaning up references...');
      let cleanedCount = 0;
      
      for (const row of referencingMoments.rows) {
        // Filter out the deleted IDs from prior_moment_ids
        const cleanedPriors = row.prior_moment_ids.filter(id => !targetIds.includes(id));
        
        await pool.query(`
          UPDATE mind_moments
          SET prior_moment_ids = $1
          WHERE id = $2
        `, [cleanedPriors, row.id]);
        
        cleanedCount++;
        const removedCount = row.prior_moment_ids.length - cleanedPriors.length;
        console.log(`   ✓ Cycle ${row.cycle}: removed ${removedCount} orphaned ref(s), kept ${cleanedPriors.length}`);
      }
      
      console.log(`\n✓ Cleaned ${cleanedCount} moments\n`);
      
      // Step 2: Delete the moments without sigils
      console.log('🗑️  Step 2: Deleting moments without sigils...');
      
      const deleteResult = await pool.query(`
        DELETE FROM mind_moments
        WHERE sigil_code IS NULL
        RETURNING cycle
      `);
      
      console.log(`\n✓ Deleted ${deleteResult.rows.length} moments:`);
      deleteResult.rows.forEach(row => {
        console.log(`   - Cycle ${row.cycle}`);
      });
      
      // Commit transaction
      await pool.query('COMMIT');
      
      console.log('\n' + '═'.repeat(80));
      console.log('\n✅ SOFT CLEANUP COMPLETE!\n');
      console.log(`Summary:`);
      console.log(`   - ${deleteResult.rows.length} moments deleted`);
      console.log(`   - ${cleanedCount} moments cleaned up`);
      console.log(`   - Database integrity maintained`);
      console.log(`   - No cascading deletions\n`);
      
      // Show final stats
      const finalStats = await pool.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(sigil_code) as with_sigils
        FROM mind_moments
      `);
      
      console.log(`Final database state:`);
      console.log(`   - Total moments: ${finalStats.rows[0].total}`);
      console.log(`   - With sigils: ${finalStats.rows[0].with_sigils}`);
      console.log(`   - Coverage: 100%\n`);
      
      console.log('═'.repeat(80) + '\n');
      
    } catch (error) {
      // Rollback on error
      await pool.query('ROLLBACK');
      throw error;
    }
    
  } catch (error) {
    console.error('\n❌ Error during cleanup:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

softCleanup();
