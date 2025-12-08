#!/usr/bin/env node

/**
 * Sound Brief Health Check
 * 
 * Analyzes the health of sound briefs across all mind moments.
 * Reports statistics without making any changes.
 * 
 * Usage:
 *   node scripts/check-sound-briefs.js
 */

import 'dotenv/config';
import { initDatabase, getPool } from '../src/db/index.js';

async function checkSoundBriefs() {
  console.log('🏥 Sound Brief Health Check\n');
  console.log('━'.repeat(50));
  
  // Initialize database
  console.log('📦 Connecting to database...');
  const pool = initDatabase();
  
  if (!pool) {
    console.error('❌ Database not available. Make sure DATABASE_URL is set in .env');
    console.error('   Copy .env.example to .env and configure your database connection.');
    process.exit(1);
  }
  
  console.log('✓ Connected to database');
  
  // Get total mind moments
  const totalResult = await pool.query(`
    SELECT COUNT(*) as count
    FROM mind_moments
    WHERE mind_moment IS NOT NULL 
      AND mind_moment != ''
      AND LENGTH(mind_moment) > 20
  `);
  
  const total = parseInt(totalResult.rows[0].count);
  console.log(`✓ Found ${total} mind moments\n`);
  
  // Count by status
  const queries = {
    healthy: `
      SELECT COUNT(*) as count
      FROM mind_moments
      WHERE sound_brief IS NOT NULL
        AND (sound_brief->>'valid')::boolean = true
        AND sound_brief->'selections'->>'music_filename' IS NOT NULL
        AND sound_brief->'selections'->>'texture_filename' IS NOT NULL
    `,
    
    missing: `
      SELECT COUNT(*) as count
      FROM mind_moments
      WHERE sound_brief IS NULL
        AND mind_moment IS NOT NULL 
        AND mind_moment != ''
        AND LENGTH(mind_moment) > 20
    `,
    
    invalid: `
      SELECT COUNT(*) as count
      FROM mind_moments
      WHERE sound_brief IS NOT NULL
        AND (sound_brief->>'valid')::boolean = false
    `,
    
    incomplete: `
      SELECT COUNT(*) as count
      FROM mind_moments
      WHERE sound_brief IS NOT NULL
        AND (sound_brief->>'valid')::boolean IS DISTINCT FROM false
        AND (
          sound_brief->'selections' IS NULL
          OR sound_brief->'selections'->>'music_filename' IS NULL
          OR sound_brief->'selections'->>'texture_filename' IS NULL
        )
    `
  };
  
  const results = {};
  for (const [key, query] of Object.entries(queries)) {
    const result = await pool.query(query);
    results[key] = parseInt(result.rows[0].count);
  }
  
  const broken = results.missing + results.invalid + results.incomplete;
  const healthPercent = ((results.healthy / total) * 100).toFixed(1);
  
  // Display results
  console.log('📊 Overall Health\n');
  console.log(`✅ Healthy:     ${results.healthy.toString().padStart(4)} (${healthPercent}%)`);
  console.log(`❌ Broken:      ${broken.toString().padStart(4)} (${((broken / total) * 100).toFixed(1)}%)`);
  console.log('');
  
  console.log('📋 Breakdown\n');
  console.log(`   Missing:     ${results.missing.toString().padStart(4)} (no sound_brief)`);
  console.log(`   Invalid:     ${results.invalid.toString().padStart(4)} (valid = false)`);
  console.log(`   Incomplete:  ${results.incomplete.toString().padStart(4)} (missing fields)`);
  console.log('');
  
  // Sample broken moments
  if (broken > 0) {
    console.log('━'.repeat(50));
    console.log('🔍 Sample Broken Moments (most recent)\n');
    
    const sampleQuery = `
      SELECT 
        cycle,
        mind_moment,
        CASE 
          WHEN sound_brief IS NULL THEN 'missing'
          WHEN (sound_brief->>'valid')::boolean = false THEN 'invalid'
          ELSE 'incomplete'
        END as issue,
        sound_brief->'errors' as errors
      FROM mind_moments
      WHERE 
        mind_moment IS NOT NULL 
        AND (
          sound_brief IS NULL
          OR (sound_brief->>'valid')::boolean = false
          OR sound_brief->'selections' IS NULL
          OR sound_brief->'selections'->>'music_filename' IS NULL
          OR sound_brief->'selections'->>'texture_filename' IS NULL
        )
      ORDER BY cycle DESC
      LIMIT 10
    `;
    
    const samples = await pool.query(sampleQuery);
    
    samples.rows.forEach((row, i) => {
      console.log(`${i + 1}. Cycle ${row.cycle} - ${row.issue}`);
      console.log(`   "${row.mind_moment.substring(0, 70)}..."`);
      if (row.errors) {
        console.log(`   Errors: ${JSON.stringify(row.errors)}`);
      }
      console.log('');
    });
  }
  
  // Most common music samples
  console.log('━'.repeat(50));
  console.log('🎵 Most Common Music Samples\n');
  
  const musicQuery = `
    SELECT 
      sound_brief->'selections'->>'music_filename' as filename,
      COUNT(*) as count
    FROM mind_moments
    WHERE (sound_brief->>'valid')::boolean = true
    GROUP BY sound_brief->'selections'->>'music_filename'
    ORDER BY count DESC
    LIMIT 10
  `;
  
  const musicStats = await pool.query(musicQuery);
  musicStats.rows.forEach((row, i) => {
    console.log(`${(i + 1).toString().padStart(2)}. ${row.filename?.padEnd(25)} ${row.count} times`);
  });
  
  // Most common texture samples
  console.log('\n🌊 Most Common Texture Samples\n');
  
  const textureQuery = `
    SELECT 
      sound_brief->'selections'->>'texture_filename' as filename,
      COUNT(*) as count
    FROM mind_moments
    WHERE (sound_brief->>'valid')::boolean = true
    GROUP BY sound_brief->'selections'->>'texture_filename'
    ORDER BY count DESC
    LIMIT 10
  `;
  
  const textureStats = await pool.query(textureQuery);
  textureStats.rows.forEach((row, i) => {
    console.log(`${(i + 1).toString().padStart(2)}. ${row.filename?.padEnd(25)} ${row.count} times`);
  });
  
  // Recommendations
  console.log('\n━'.repeat(50));
  console.log('💡 Recommendations\n');
  
  if (broken === 0) {
    console.log('✅ All sound briefs are healthy! No action needed.');
  } else if (broken < 10) {
    console.log(`⚠️  ${broken} broken sound briefs detected.`);
    console.log('   Run: node scripts/repair-sound-briefs.js');
  } else {
    console.log(`⚠️  ${broken} broken sound briefs detected.`);
    console.log('   Run: node scripts/repair-sound-briefs.js 50');
    console.log('   (Process in batches to avoid rate limits)');
  }
  
  if (healthPercent < 50) {
    console.log('\n⚠️  Low health detected. Consider:');
    console.log('   1. Checking LLM API status');
    console.log('   2. Reviewing sound prompt configuration');
    console.log('   3. Validating CSV files');
  }
  
  console.log('');
  process.exit(0);
}

// Run the check
checkSoundBriefs().catch(error => {
  console.error('\n💥 Fatal error:', error);
  process.exit(1);
});
