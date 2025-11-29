import 'dotenv/config';
import { initDatabase, getPool } from '../src/db/index.js';

async function analyzeImpact() {
  initDatabase();
  const pool = getPool();
  
  console.log('🔍 Analyzing impact of deleting mind moments without sigil_code...\n');
  console.log('═'.repeat(80));
  
  // Get the moments without sigils
  const noSigils = await pool.query(`
    SELECT id, cycle, session_id, created_at, mind_moment, sigil_phrase
    FROM mind_moments
    WHERE sigil_code IS NULL
    ORDER BY cycle ASC
  `);
  
  console.log(`\n📋 ${noSigils.rows.length} mind moments would be deleted:\n`);
  
  // Check which sessions would be affected
  const sessions = new Set(noSigils.rows.map(r => r.session_id).filter(Boolean));
  console.log(`📦 Affected sessions: ${sessions.size}`);
  sessions.forEach(sid => console.log(`   - ${sid}`));
  
  // Check if any are part of a continuous sequence
  const cycles = noSigils.rows.map(r => r.cycle).sort((a, b) => a - b);
  console.log(`\n🔢 Cycle numbers to be deleted: ${cycles.join(', ')}`);
  
  // Check for gaps this would create
  const allCycles = await pool.query(`
    SELECT cycle FROM mind_moments ORDER BY cycle ASC
  `);
  
  const remainingCycles = allCycles.rows.map(r => r.cycle).filter(c => !cycles.includes(c));
  console.log(`\n📊 After deletion:`);
  console.log(`   - Remaining moments: ${remainingCycles.length}`);
  console.log(`   - Deleted moments: ${cycles.length}`);
  console.log(`   - Cycle range: ${remainingCycles[0]} to ${remainingCycles[remainingCycles.length - 1]}`);
  
  // Check if there are prior_moment_ids references
  const priorReferences = await pool.query(`
    SELECT mm1.cycle, mm1.id, mm2.cycle as references_cycle
    FROM mind_moments mm1, mind_moments mm2
    WHERE mm2.sigil_code IS NULL
    AND mm1.prior_moment_ids::text LIKE '%' || mm2.id || '%'
    ORDER BY mm1.cycle
  `);
  
  console.log(`\n🔗 Mind moments with prior_moments references to deleted moments: ${priorReferences.rows.length}`);
  if (priorReferences.rows.length > 0) {
    console.log('   Examples:');
    priorReferences.rows.slice(0, 5).forEach(row => {
      console.log(`   - Cycle ${row.cycle} references deleted cycle ${row.references_cycle}`);
    });
  }
  
  // Show detailed info about what would be lost
  console.log(`\n📝 Detailed breakdown:\n`);
  noSigils.rows.forEach((row, i) => {
    console.log(`${i + 1}. Cycle ${row.cycle} (${row.created_at?.toISOString().split('T')[0]})`);
    console.log(`   Session: ${row.session_id || 'none'}`);
    console.log(`   Phrase: "${row.sigil_phrase || 'N/A'}"`);
    console.log(`   Moment: ${row.mind_moment?.substring(0, 70)}...`);
    console.log();
  });
  
  console.log('═'.repeat(80));
  console.log(`\n⚠️  RAMIFICATIONS:\n`);
  console.log(`1. Historical Record:`);
  console.log(`   - You'll lose ${cycles.length} mind moments from your consciousness archive`);
  console.log(`   - Some are early moments (cycles 1, 5) - potentially interesting historical data`);
  console.log(`   - Some are recent (cycles 123-125) - recent memory would be lost`);
  
  console.log(`\n2. Cycle Numbering:`);
  console.log(`   - Cycle numbers will have gaps (e.g., 1→5→46→69→98→100→123-125→126)`);
  console.log(`   - Current cycle counter won't be affected (continues from latest)`);
  
  console.log(`\n3. Database Integrity:`);
  console.log(`   - Foreign key references in prior_moments arrays may become orphaned`);
  console.log(`   - ${priorReferences.rows.length} other moments reference these as prior context`);
  
  console.log(`\n4. Dashboard/History:`);
  console.log(`   - History grid will show gaps in the timeline`);
  console.log(`   - Any session filtering may show incomplete sequences`);
  
  console.log(`\n5. Benefits:`);
  console.log(`   - Cleaner dataset (100% sigil coverage)`);
  console.log(`   - All remaining moments have complete sigil data`);
  console.log(`   - Easier to reason about the data (no NULL handling needed)`);
  
  console.log(`\n💡 RECOMMENDATION:`);
  console.log(`   Instead of deleting, consider:`);
  console.log(`   - Keeping them as historical record (they're only ${cycles.length} out of ${allCycles.rows.length})`);
  console.log(`   - Adding a flag like 'has_sigil' for filtering in queries`);
  console.log(`   - The 7.4% without sigils doesn't seem worth the data loss`);
  
  console.log(`\n${'═'.repeat(80)}\n`);
  
  await pool.end();
  process.exit(0);
}

analyzeImpact().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});

