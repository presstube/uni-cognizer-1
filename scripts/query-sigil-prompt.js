import 'dotenv/config';
import { initDatabase, getPool } from '../src/db/index.js';

async function querySigilPrompt() {
  try {
    initDatabase();
    
    if (!process.env.DATABASE_URL) {
      console.log('⚠️  DATABASE_URL not set - cannot query database');
      process.exit(1);
    }
    
    const pool = getPool();
    
    const slug = process.argv[2] || 'percept-fast-1';
    
    const result = await pool.query(`
      SELECT * FROM sigil_prompts 
      WHERE slug = $1 OR name ILIKE $2
      ORDER BY updated_at DESC
      LIMIT 1
    `, [slug, `%${slug}%`]);
    
    if (result.rows.length === 0) {
      console.log(`\n📭 No sigil prompt found matching: ${slug}\n`);
      process.exit(0);
    }
    
    const p = result.rows[0];
    
    console.log('\n📊 Sigil Prompt Profile:\n');
    console.log('═'.repeat(80));
    console.log(`Name: ${p.name}`);
    console.log(`Slug: ${p.slug}`);
    console.log(`Active: ${p.active ? '✓' : '✗'}`);
    console.log(`\nllm_settings (JSONB):`);
    console.log(JSON.stringify(p.llm_settings, null, 2));
    console.log(`\nImage Settings:`);
    console.log(`  Include Image: ${p.include_image ?? 'NOT SET'}`);
    console.log(`  Custom Image Path: ${p.reference_image_path || 'NOT SET'}`);
    console.log(`\nPrompt Preview:`);
    console.log(p.prompt.substring(0, 300) + '...');
    console.log(`\nDates:`);
    console.log(`  Created: ${p.created_at}`);
    console.log(`  Updated: ${p.updated_at}`);
    console.log('═'.repeat(80) + '\n');
    
  } catch (error) {
    console.error('❌ Error querying sigil prompt:', error.message);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

querySigilPrompt();

