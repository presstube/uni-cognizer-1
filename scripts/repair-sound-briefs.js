#!/usr/bin/env node

/**
 * Repair Sound Briefs Script
 * 
 * Finds mind moments with missing or invalid sound briefs and regenerates them.
 * 
 * Checks for:
 * - NULL sound_brief
 * - sound_brief.valid = false
 * - Malformed JSON
 * - Missing required fields
 * 
 * Usage:
 *   node scripts/repair-sound-briefs.js [limit]
 *   
 * Examples:
 *   node scripts/repair-sound-briefs.js          # Process all broken sound briefs
 *   node scripts/repair-sound-briefs.js 50       # Process up to 50
 */

import 'dotenv/config';
import { initDatabase, getPool } from '../src/db/index.js';
import { generateAudioSelections } from '../src/sound/generator.js';
import { getActiveSoundPrompt, getActiveCSVs, getDefaultCSVs } from '../src/db/sound-prompts.js';

const LIMIT = parseInt(process.argv[2]) || null;
const THROTTLE_MS = 1000; // 1 second between calls
const MAX_RETRIES = 2;

async function repairSoundBriefs() {
  console.log('🔧 Sound Brief Repair Tool\n');
  console.log('━'.repeat(50));
  
  // Step 1: Initialize database
  console.log('📦 Initializing database...');
  const pool = initDatabase();
  
  if (!pool) {
    console.error('❌ Database not available. Make sure DATABASE_URL is set in .env');
    console.error('   Copy .env.example to .env and configure your database connection.');
    process.exit(1);
  }
  
  console.log('✓ Connected to database');
  
  // Step 2: Get active prompt and CSVs
  console.log('📋 Loading sound generation config...');
  const activePrompt = await getActiveSoundPrompt();
  if (!activePrompt) {
    console.error('❌ No active sound prompt found. Exiting.');
    process.exit(1);
  }
  
  const csvs = await getActiveCSVs();
  const defaults = await getDefaultCSVs();
  const musicCSV = csvs.music?.content || defaults.music?.content;
  const textureCSV = csvs.texture?.content || defaults.texture?.content;
  
  if (!musicCSV || !textureCSV) {
    console.error('❌ Missing CSV files. Exiting.');
    process.exit(1);
  }
  
  console.log(`✓ Using prompt: "${activePrompt.name}"`);
  console.log(`✓ Music CSV: ${csvs.music?.filename || defaults.music?.filename}`);
  console.log(`✓ Texture CSV: ${csvs.texture?.filename || defaults.texture?.filename}`);
  
  // Step 3: Find moments with broken sound briefs
  console.log('\n🔍 Scanning for broken sound briefs...');
  
  const query = `
    SELECT 
      id, 
      cycle, 
      mind_moment,
      sound_brief
    FROM mind_moments
    WHERE 
      mind_moment IS NOT NULL 
      AND mind_moment != ''
      AND LENGTH(mind_moment) > 20
      AND (
        -- No sound brief at all
        sound_brief IS NULL
        -- Invalid sound brief
        OR (sound_brief->>'valid')::boolean = false
        -- Missing required fields
        OR sound_brief->'selections' IS NULL
        OR sound_brief->'selections'->>'music_filename' IS NULL
        OR sound_brief->'selections'->>'texture_filename' IS NULL
      )
    ORDER BY cycle DESC
    ${LIMIT ? `LIMIT ${LIMIT}` : ''}
  `;
  
  const result = await pool.query(query);
  const moments = result.rows;
  
  console.log(`✓ Found ${moments.length} moments needing repair`);
  
  if (moments.length === 0) {
    console.log('\n✅ All sound briefs are healthy! Exiting.');
    process.exit(0);
  }
  
  // Step 4: Categorize issues
  const stats = {
    null: 0,
    invalid: 0,
    missingFields: 0
  };
  
  moments.forEach(m => {
    if (!m.sound_brief) {
      stats.null++;
    } else if (m.sound_brief.valid === false) {
      stats.invalid++;
    } else {
      stats.missingFields++;
    }
  });
  
  console.log('\n📊 Issue breakdown:');
  console.log(`   ${stats.null} missing sound briefs (NULL)`);
  console.log(`   ${stats.invalid} invalid sound briefs`);
  console.log(`   ${stats.missingFields} incomplete sound briefs`);
  
  // Step 5: Process each broken moment
  console.log('\n━'.repeat(50));
  console.log('🎵 Starting repair process...\n');
  
  let successCount = 0;
  let errorCount = 0;
  
  for (let i = 0; i < moments.length; i++) {
    const moment = moments[i];
    const progress = `[${i + 1}/${moments.length}]`;
    
    console.log(`${progress} Cycle ${moment.cycle}`);
    console.log(`  Text: "${moment.mind_moment.substring(0, 60)}..."`);
    
    // Show current issue
    if (!moment.sound_brief) {
      console.log(`  Issue: Missing sound brief`);
    } else if (moment.sound_brief.valid === false) {
      console.log(`  Issue: Invalid (${moment.sound_brief.errors?.join(', ') || 'unknown error'})`);
    } else {
      console.log(`  Issue: Incomplete data`);
    }
    
    try {
      // Retry loop
      const startTime = Date.now();
      let soundBrief = null;
      let lastError = null;
      
      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
          soundBrief = await generateAudioSelections({
            input: moment.mind_moment,
            prompt: activePrompt.prompt,
            llmSettings: activePrompt.llm_settings || {},
            musicCSV,
            textureCSV
          });
          
          // Check if valid
          if (soundBrief.valid) {
            break; // Success!
          } else {
            lastError = soundBrief.errors.join(', ');
            if (attempt < MAX_RETRIES) {
              console.log(`  ⚠️  Invalid (attempt ${attempt}/${MAX_RETRIES}): ${lastError}`);
              console.log(`     Retrying...`);
              await new Promise(resolve => setTimeout(resolve, 500));
            }
          }
        } catch (genError) {
          lastError = genError.message;
          if (attempt < MAX_RETRIES) {
            console.log(`  ⚠️  Error (attempt ${attempt}/${MAX_RETRIES}): ${genError.message}`);
            console.log(`     Retrying...`);
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
      }
      
      const duration = Date.now() - startTime;
      
      if (!soundBrief || !soundBrief.valid) {
        console.log(`  ❌ Failed after ${MAX_RETRIES} attempts: ${lastError}`);
        errorCount++;
        console.log('');
        continue;
      }
      
      // Update database
      await pool.query(
        'UPDATE mind_moments SET sound_brief = $1 WHERE id = $2',
        [JSON.stringify(soundBrief), moment.id]
      );
      
      console.log(`  ✓ Repaired in ${duration}ms`);
      console.log(`    Music: ${soundBrief.selections.music_filename}`);
      console.log(`    Texture: ${soundBrief.selections.texture_filename}`);
      successCount++;
      
    } catch (error) {
      console.log(`  ❌ Unexpected error: ${error.message}`);
      errorCount++;
    }
    
    console.log('');
    
    // Throttle between requests
    if (i < moments.length - 1) {
      await new Promise(resolve => setTimeout(resolve, THROTTLE_MS));
    }
  }
  
  // Summary
  console.log('━'.repeat(50));
  console.log('📊 Repair Summary\n');
  console.log(`Total processed:  ${moments.length}`);
  console.log(`✓ Repaired:       ${successCount}`);
  console.log(`❌ Failed:        ${errorCount}`);
  
  const successRate = ((successCount / moments.length) * 100).toFixed(1);
  console.log(`\nSuccess rate: ${successRate}%`);
  
  if (successCount > 0) {
    console.log('\n✅ Sound brief repair complete!');
  }
  
  if (errorCount > 0) {
    console.log(`\n⚠️  ${errorCount} moments still need attention.`);
    console.log('   Run this script again or check the logs for details.');
  }
  
  process.exit(0);
}

// Run the repair
repairSoundBriefs().catch(error => {
  console.error('\n💥 Fatal error:', error);
  process.exit(1);
});


