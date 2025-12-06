import 'dotenv/config';
import { initDatabase, getPool } from '../src/db/index.js';

async function querySchema() {
  try {
    initDatabase();
    
    if (!process.env.DATABASE_URL) {
      console.log('⚠️  DATABASE_URL not set');
      process.exit(1);
    }
    
    const pool = getPool();
    
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'sigil_prompts'
      ORDER BY ordinal_position
    `);
    
    console.log('\n📋 Columns in sigil_prompts table:\n');
    result.rows.forEach(r => {
      console.log(`  ${r.column_name.padEnd(25)} ${r.data_type.padEnd(20)} ${r.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });
    console.log();
    
    await pool.end();
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

querySchema();










