import 'dotenv/config';
import { initDatabase, getPool } from '../src/db/index.js';

async function deleteCycle138() {
  initDatabase();
  const pool = getPool();
  
  const confirmDelete = process.argv[2] === '--confirm';
  
  console.log('\n🗑️  DELETE CYCLE #138\n');
  console.log('═'.repeat(80));
  
  try {
    // Get cycle 138
    const moment = await pool.query(`
      SELECT id, cycle, session_id, mind_moment, sigil_phrase, sigil_code
      FROM mind_moments
      WHERE cycle = 138
    `);
    
    if (moment.rows.length === 0) {
      console.log('\n❌ Cycle #138 not found\n');
      await pool.end();
      process.exit(1);
    }
    
    const target = moment.rows[0];
    const targetId = target.id;
    
    console.log(`\n🎯 Target:`);
    console.log(`   Cycle: ${target.cycle}`);
    console.log(`   Phrase: "${target.sigil_phrase || 'N/A'}"`);
    console.log(`   Has sigil: ${target.sigil_code ? 'Yes' : 'No'}`);
    console.log(`   ID: ${targetId}`);
    
    // Find moments that reference this cycle in their prior_moment_ids
    const referencingMoments = await pool.query(`
      SELECT 
        id, 
        cycle, 
        sigil_phrase,
        prior_moment_ids
      FROM mind_moments
      WHERE $1 = ANY(prior_moment_ids)
      ORDER BY cycle
    `, [targetId]);
    
    console.log(`\n🔗 Moments that reference cycle #138: ${referencingMoments.rows.length}`);
    referencingMoments.rows.forEach(row => {
      console.log(`   Cycle ${row.cycle}: "${row.sigil_phrase}" (has ${row.prior_moment_ids.length} priors)`);
    });
    
    console.log('\n' + '═'.repeat(80));
    console.log('\n⚠️  This will:');
    console.log(`   1. DELETE cycle #138`);
    console.log(`   2. REMOVE references to cycle #138 from ${referencingMoments.rows.length} other moment(s)`);
    console.log(`   3. Keep all other moments intact\n`);
    
    if (!confirmDelete) {
      console.log('❌ NOT CONFIRMED - This is a dry run\n');
      console.log('To actually delete cycle #138, run:');
      console.log('  node scripts/delete-cycle-138.js --confirm\n');
      console.log('═'.repeat(80) + '\n');
      await pool.end();
      process.exit(0);
    }
    
    console.log('✅ CONFIRMED - Starting deletion...\n');
    
    // Begin transaction
    await pool.query('BEGIN');
    
    try {
      // Step 1: Clean up prior_moment_ids in referencing moments
      console.log('📝 Step 1: Removing references...');
      let cleanedCount = 0;
      
      for (const row of referencingMoments.rows) {
        // Filter out the target ID from prior_moment_ids
        const cleanedPriors = row.prior_moment_ids.filter(id => id !== targetId);
        
        await pool.query(`
          UPDATE mind_moments
          SET prior_moment_ids = $1
          WHERE id = $2
        `, [cleanedPriors, row.id]);
        
        cleanedCount++;
        const removedCount = row.prior_moment_ids.length - cleanedPriors.length;
        console.log(`   ✓ Cycle ${row.cycle}: removed ${removedCount} ref(s), kept ${cleanedPriors.length}`);
      }
      
      console.log(`\n✓ Cleaned ${cleanedCount} moments\n`);
      
      // Step 2: Delete cycle 138
      console.log('🗑️  Step 2: Deleting cycle #138...');
      
      const deleteResult = await pool.query(`
        DELETE FROM mind_moments
        WHERE cycle = 138
        RETURNING cycle
      `);
      
      console.log(`\n✓ Deleted cycle ${deleteResult.rows[0].cycle}\n`);
      
      // Commit transaction
      await pool.query('COMMIT');
      
      console.log('═'.repeat(80));
      console.log('\n✅ DELETION COMPLETE!\n');
      console.log(`Summary:`);
      console.log(`   - 1 moment deleted (cycle #138)`);
      console.log(`   - ${cleanedCount} moments cleaned up`);
      console.log(`   - Database integrity maintained\n`);
      
      console.log('═'.repeat(80) + '\n');
      
    } catch (error) {
      // Rollback on error
      await pool.query('ROLLBACK');
      throw error;
    }
    
  } catch (error) {
    console.error('\n❌ Error during deletion:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

deleteCycle138();













