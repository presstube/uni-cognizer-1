import 'dotenv/config';
import { initDatabase, getPool } from '../src/db/index.js';

async function checkPriorMoments() {
  try {
    initDatabase();
    
    if (!process.env.DATABASE_URL) {
      console.log('⚠️  DATABASE_URL not set - cannot query database');
      process.exit(1);
    }
    
    const pool = getPool();
    
    // Query mind moments with prior_moment_ids info
    const result = await pool.query(`
      SELECT 
        id,
        cycle,
        prior_moment_ids,
        array_length(prior_moment_ids, 1) as prior_count,
        created_at
      FROM mind_moments
      WHERE session_id = 'uni'
      ORDER BY cycle DESC
      LIMIT 20
    `);
    
    if (result.rows.length === 0) {
      console.log('📭 No mind moments found in database');
      return;
    }
    
    console.log(`\n📊 Checking prior_moment_ids for last 20 moments:\n`);
    console.log('═'.repeat(80));
    
    let withPriors = 0;
    let withoutPriors = 0;
    
    result.rows.forEach((row) => {
      const hasPriors = row.prior_count > 0;
      if (hasPriors) withPriors++;
      else withoutPriors++;
      
      const status = hasPriors ? '✓' : '✗';
      const count = row.prior_count || 0;
      
      console.log(`${status} Cycle #${row.cycle}: ${count} prior moments`);
      if (hasPriors) {
        console.log(`  IDs: ${row.prior_moment_ids.map(id => id.substring(0, 8)).join(', ')}...`);
      }
    });
    
    console.log('\n' + '═'.repeat(80));
    console.log(`\n📈 Summary:`);
    console.log(`   With priors: ${withPriors}`);
    console.log(`   Without priors: ${withoutPriors}`);
    console.log(`\n✓ Check complete\n`);
    
  } catch (error) {
    console.error('❌ Error checking prior moments:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

checkPriorMoments();

