#!/usr/bin/env node

import 'dotenv/config';
import { getPool } from '../src/db/index.js';
import { ROBOT_PERSONALITY } from '../src/personality-uni-v2.js';

/**
 * Seed Script: Initial Personality
 * 
 * Seeds the database with the current hardcoded personality as v2.0
 * Run once after migration: npm run db:seed-personality
 */

async function seedPersonality() {
  const pool = getPool();
  
  if (!pool) {
    console.error('❌ Database not enabled. Set DATABASE_ENABLED=true');
    process.exit(1);
  }
  
  try {
    // Check if personality already exists
    const existing = await pool.query(
      'SELECT id FROM personalities WHERE slug = $1',
      ['uni-tripartite-v2-0']
    );
    
    if (existing.rows.length > 0) {
      console.log('⚠️  Personality "uni-tripartite-v2-0" already exists');
      console.log('   Skipping seed');
      process.exit(0);
    }
    
    // Insert default personality
    const result = await pool.query(`
      INSERT INTO personalities (name, slug, prompt, active)
      VALUES ($1, $2, $3, true)
      RETURNING id, name, slug, active
    `, [
      'UNI Tripartite v2.0',
      'uni-tripartite-v2-0',
      ROBOT_PERSONALITY
    ]);
    
    const personality = result.rows[0];
    
    console.log('✅ Seeded default personality:');
    console.log(`   ID: ${personality.id}`);
    console.log(`   Name: ${personality.name}`);
    console.log(`   Slug: ${personality.slug}`);
    console.log(`   Active: ${personality.active}`);
    console.log(`   Prompt length: ${ROBOT_PERSONALITY.length} characters`);
    
  } catch (error) {
    console.error('❌ Seed failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seedPersonality();

