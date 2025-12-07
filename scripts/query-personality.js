import 'dotenv/config';
import { initDatabase, getPool } from '../src/db/index.js';

async function queryPersonality() {
  try {
    initDatabase();
    
    if (!process.env.DATABASE_URL) {
      console.log('⚠️  DATABASE_URL not set - cannot query database');
      process.exit(1);
    }
    
    const pool = getPool();
    
    // Get the personality
    const slug = process.argv[2] || 'lalatest';
    
    const result = await pool.query(`
      SELECT * FROM personalities 
      WHERE slug = $1 OR name ILIKE $2
      ORDER BY updated_at DESC
      LIMIT 1
    `, [slug, `%${slug}%`]);
    
    if (result.rows.length === 0) {
      console.log(`📭 No personality found matching: ${slug}`);
      process.exit(0);
    }
    
    const personality = result.rows[0];
    
    console.log('\n📊 Personality Profile:\n');
    console.log('═'.repeat(80));
    console.log(`Name: ${personality.name}`);
    console.log(`Slug: ${personality.slug}`);
    console.log(`Active: ${personality.active ? '✓' : '✗'}`);
    console.log(`\nLLM Settings:`);
    console.log(`  Provider: ${personality.provider || 'NOT SET'}`);
    console.log(`  Model: ${personality.model || 'NOT SET'}`);
    console.log(`  Temperature: ${personality.temperature ?? 'NOT SET'}`);
    console.log(`  Top P: ${personality.top_p ?? 'NOT SET'}`);
    console.log(`  Top K: ${personality.top_k ?? 'NOT SET'}`);
    console.log(`  Max Tokens: ${personality.max_tokens ?? 'NOT SET'}`);
    console.log(`\nPrompt Preview:`);
    console.log(personality.prompt.substring(0, 200) + '...');
    console.log(`\nDates:`);
    console.log(`  Created: ${personality.created_at}`);
    console.log(`  Updated: ${personality.updated_at}`);
    console.log('═'.repeat(80) + '\n');
    
  } catch (error) {
    console.error('❌ Error querying personality:', error.message);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

queryPersonality();











