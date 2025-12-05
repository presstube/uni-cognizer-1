import 'dotenv/config';
import { initDatabase, getPool } from '../src/db/index.js';

async function listAllPersonalities() {
  try {
    initDatabase();
    
    if (!process.env.DATABASE_URL) {
      console.log('⚠️  DATABASE_URL not set - cannot query database');
      process.exit(1);
    }
    
    const pool = getPool();
    
    const result = await pool.query(`
      SELECT name, slug, provider, model, temperature, top_p, top_k, max_tokens, active, created_at, updated_at 
      FROM personalities 
      ORDER BY updated_at DESC
    `);
    
    console.log('\n📊 All Personalities in Database:\n');
    console.log('═'.repeat(100));
    
    result.rows.forEach((p, i) => {
      console.log(`\n[${i + 1}] ${p.name} (${p.slug})`);
      console.log(`    Active: ${p.active ? '✓' : '✗'}`);
      console.log(`    Provider: ${p.provider || 'NOT SET'}`);
      console.log(`    Model: ${p.model || 'NOT SET'}`);
      console.log(`    Temperature: ${p.temperature ?? 'NOT SET'}`);
      console.log(`    Top P: ${p.top_p ?? 'NOT SET'}`);
      console.log(`    Top K: ${p.top_k ?? 'NOT SET'}`);
      console.log(`    Max Tokens: ${p.max_tokens ?? 'NOT SET'}`);
      console.log(`    Created: ${p.created_at}`);
      console.log(`    Updated: ${p.updated_at}`);
    });
    
    console.log('\n' + '═'.repeat(100));
    console.log(`\nTotal: ${result.rows.length} personalities\n`);
    
  } catch (error) {
    console.error('❌ Error querying personalities:', error.message);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

listAllPersonalities();








