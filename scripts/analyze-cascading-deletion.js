import 'dotenv/config';
import { initDatabase, getPool } from '../src/db/index.js';

async function analyzeCascadingDeletion() {
  initDatabase();
  const pool = getPool();
  
  console.log('🔍 Analyzing CASCADING deletion impact...\n');
  console.log('═'.repeat(80));
  
  // Get the moments without sigils (the targets)
  const noSigils = await pool.query(`
    SELECT id, cycle, session_id, mind_moment, sigil_phrase
    FROM mind_moments
    WHERE sigil_code IS NULL
    ORDER BY cycle ASC
  `);
  
  const targetIds = noSigils.rows.map(r => r.id);
  const targetCycles = noSigils.rows.map(r => r.cycle);
  
  console.log(`\n🎯 Primary targets (no sigil_code): ${noSigils.rows.length} moments`);
  console.log(`   Cycles: ${targetCycles.join(', ')}`);
  
  // Find moments that reference these in their prior_moment_ids
  const referencingMoments = await pool.query(`
    SELECT 
      id, 
      cycle, 
      session_id,
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
  
  console.log(`\n🔗 Moments that reference deleted ones: ${referencingMoments.rows.length}`);
  
  // Categorize the referencing moments
  const partialReferences = []; // Have some but not all references to deleted
  const fullReferences = []; // ALL references are to deleted moments
  
  for (const row of referencingMoments.rows) {
    const totalPriors = row.prior_moment_ids.length;
    const deletedRefs = row.references_deleted_cycles?.length || 0;
    
    if (deletedRefs === totalPriors) {
      fullReferences.push(row);
    } else {
      partialReferences.push(row);
    }
  }
  
  console.log(`\n   - ${partialReferences.length} have PARTIAL references (can clean up)`);
  console.log(`   - ${fullReferences.length} have ONLY deleted references (orphaned)`);
  
  // Show the cascading options
  console.log(`\n═'.repeat(80)`);
  console.log(`\n📊 CASCADING OPTIONS:\n`);
  
  console.log(`Option 1: SOFT CLEANUP (Recommended)`);
  console.log(`   - Delete ${noSigils.rows.length} moments without sigils`);
  console.log(`   - Clean up ${partialReferences.length} moments by removing orphaned references`);
  console.log(`   - Keep ${fullReferences.length} orphaned moments (just empty their prior_moment_ids)`);
  console.log(`   Total deletions: ${noSigils.rows.length}`);
  
  console.log(`\nOption 2: HARD CLEANUP`);
  console.log(`   - Delete ${noSigils.rows.length} moments without sigils`);
  console.log(`   - Delete ${fullReferences.length} fully orphaned moments`);
  console.log(`   - Clean up ${partialReferences.length} moments by removing orphaned references`);
  console.log(`   Total deletions: ${noSigils.rows.length + fullReferences.length}`);
  
  // Check if any of the fully orphaned moments are themselves referenced
  let secondOrderImpact = 0;
  if (fullReferences.length > 0) {
    const fullyOrphanedIds = fullReferences.map(r => r.id);
    const secondOrder = await pool.query(`
      SELECT COUNT(*) as count
      FROM mind_moments
      WHERE EXISTS (
        SELECT 1 
        FROM unnest(prior_moment_ids) AS pid
        WHERE pid = ANY($1::uuid[])
      )
      AND NOT (id = ANY($1::uuid[]))
    `, [fullyOrphanedIds]);
    secondOrderImpact = parseInt(secondOrder.rows[0].count);
  }
  
  if (secondOrderImpact > 0) {
    console.log(`\n⚠️  WARNING: Option 2 would create ${secondOrderImpact} second-order orphans!`);
    console.log(`   (Moments that reference the fully orphaned moments)`);
    console.log(`   This could cascade further...`);
  }
  
  console.log(`\n═'.repeat(80)`);
  console.log(`\n📝 DETAILED BREAKDOWN:\n`);
  
  console.log(`PRIMARY TARGETS (no sigil):`);
  noSigils.rows.forEach((row, i) => {
    console.log(`  ${i + 1}. Cycle ${row.cycle}: "${row.sigil_phrase || 'N/A'}"`);
  });
  
  if (partialReferences.length > 0) {
    console.log(`\nPARTIAL REFERENCES (will be cleaned):`);
    partialReferences.slice(0, 10).forEach(row => {
      const deletedRefs = row.references_deleted_cycles || [];
      console.log(`  Cycle ${row.cycle}: "${row.sigil_phrase || 'N/A'}"`);
      console.log(`    References deleted cycles: ${deletedRefs.join(', ')}`);
      console.log(`    Total priors: ${row.prior_moment_ids.length}, Deleted: ${deletedRefs.length}`);
    });
    if (partialReferences.length > 10) {
      console.log(`  ... and ${partialReferences.length - 10} more`);
    }
  }
  
  if (fullReferences.length > 0) {
    console.log(`\nFULLY ORPHANED (all priors deleted):`);
    fullReferences.forEach(row => {
      const deletedRefs = row.references_deleted_cycles || [];
      console.log(`  Cycle ${row.cycle}: "${row.sigil_phrase || 'N/A'}"`);
      console.log(`    Would lose ALL ${deletedRefs.length} prior references: ${deletedRefs.join(', ')}`);
    });
  }
  
  console.log(`\n═'.repeat(80)`);
  console.log(`\n💡 RECOMMENDATION:\n`);
  console.log(`Option 1 (Soft Cleanup) is safest:`);
  console.log(`  ✓ Removes incomplete moments`);
  console.log(`  ✓ Cleans up broken references`);
  console.log(`  ✓ Preserves moments that can stand alone`);
  console.log(`  ✓ No cascading deletions`);
  console.log(`\nOption 2 (Hard Cleanup) is riskier:`);
  console.log(`  ⚠️  Creates second-order orphans (${secondOrderImpact})`);
  console.log(`  ⚠️  Could require multiple passes to fully clean`);
  console.log(`  ⚠️  Loses more historical data (${noSigils.rows.length + fullReferences.length} total)`);
  
  console.log(`\n${'═'.repeat(80)}\n`);
  
  await pool.end();
  process.exit(0);
}

analyzeCascadingDeletion().catch(err => {
  console.error('Error:', err);
  console.error(err.stack);
  process.exit(1);
});

