import 'dotenv/config';
import { initDatabase, getPool } from '../src/db/index.js';

async function checkMissingSigils() {
  try {
    initDatabase();
    
    if (!process.env.DATABASE_URL) {
      console.log('⚠️  DATABASE_URL not set - cannot query database');
      process.exit(1);
    }
    
    const pool = getPool();
    
    // Check what columns exist
    const columnsQuery = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'mind_moments' 
      AND column_name LIKE 'sigil%'
      ORDER BY column_name
    `);
    
    console.log('\n📊 Available sigil columns:', columnsQuery.rows.map(r => r.column_name).join(', '));
    console.log('═'.repeat(80));
    
    // Find moments without sigil_code
    const noSigilCode = await pool.query(`
      SELECT id, cycle, created_at, mind_moment, sigil_phrase
      FROM mind_moments
      WHERE sigil_code IS NULL
      ORDER BY cycle DESC
    `);
    
    console.log(`\n📭 Mind moments WITHOUT sigil_code: ${noSigilCode.rows.length}`);
    if (noSigilCode.rows.length > 0) {
      console.log('\nRecent examples (up to 10):');
      noSigilCode.rows.slice(0, 10).forEach(row => {
        console.log(`  Cycle ${row.cycle}: "${row.sigil_phrase || 'No phrase'}" - ${row.mind_moment?.substring(0, 60)}...`);
      });
    }
    
    // Check if SDF columns exist and find moments without SDF
    if (columnsQuery.rows.find(r => r.column_name === 'sigil_sdf_data')) {
      const hasSigilButNoSDF = await pool.query(`
        SELECT id, cycle, created_at, sigil_phrase
        FROM mind_moments
        WHERE sigil_code IS NOT NULL
        AND sigil_sdf_data IS NULL
        ORDER BY cycle DESC
      `);
      
      console.log(`\n🎨 Mind moments WITH sigil_code but NO SDF: ${hasSigilButNoSDF.rows.length}`);
      if (hasSigilButNoSDF.rows.length > 0) {
        console.log('Recent examples (up to 10):');
        hasSigilButNoSDF.rows.slice(0, 10).forEach(row => {
          console.log(`  Cycle ${row.cycle}: "${row.sigil_phrase || 'No phrase'}"`);
        });
      }
    }
    
    // Check for SVG column if it exists
    if (columnsQuery.rows.find(r => r.column_name === 'sigil_svg')) {
      const hasSigilButNoSVG = await pool.query(`
        SELECT COUNT(*) as count
        FROM mind_moments
        WHERE sigil_code IS NOT NULL
        AND sigil_svg IS NULL
      `);
      console.log(`\n🖼️  Mind moments WITH sigil_code but NO SVG: ${hasSigilButNoSVG.rows[0].count}`);
    }
    
    // Total counts
    const totals = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(sigil_code) as with_code,
        COUNT(*) - COUNT(sigil_code) as without_code
      FROM mind_moments
    `);
    
    console.log('\n' + '═'.repeat(80));
    console.log('\n📈 Summary:');
    console.log(`  Total mind moments: ${totals.rows[0].total}`);
    console.log(`  With sigil_code: ${totals.rows[0].with_code}`);
    console.log(`  Without sigil_code: ${totals.rows[0].without_code}`);
    
    // Get percentage
    const percentage = totals.rows[0].total > 0 
      ? ((totals.rows[0].with_code / totals.rows[0].total) * 100).toFixed(1)
      : 0;
    console.log(`  Coverage: ${percentage}%`);
    
    console.log('\n' + '═'.repeat(80));
    console.log('\n✓ Check complete\n');
    
  } catch (error) {
    console.error('❌ Error checking sigils:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

checkMissingSigils();

