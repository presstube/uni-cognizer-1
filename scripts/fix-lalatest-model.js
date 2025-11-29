import 'dotenv/config';
import { initDatabase, getPool } from '../src/db/index.js';

async function fixLalatestModel() {
  try {
    initDatabase();
    
    if (!process.env.DATABASE_URL) {
      console.log('⚠️  DATABASE_URL not set - cannot update database');
      process.exit(1);
    }
    
    const pool = getPool();
    
    // Update lalatest to use a working model
    const result = await pool.query(`
      UPDATE personalities 
      SET model = 'gemini-2.0-flash-exp', updated_at = NOW()
      WHERE slug = 'lalatest'
      RETURNING name, slug, model
    `);
    
    if (result.rows.length > 0) {
      const p = result.rows[0];
      console.log('\n✅ Updated personality:');
      console.log(`   Name: ${p.name}`);
      console.log(`   Slug: ${p.slug}`);
      console.log(`   New Model: ${p.model}\n`);
    } else {
      console.log('\n⚠️  No personality found with slug "lalatest"\n');
    }
    
    await pool.end();
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error updating personality:', error.message);
    process.exit(1);
  }
}

fixLalatestModel();

