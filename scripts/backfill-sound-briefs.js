#!/usr/bin/env node
/**
 * Backfill Sound Briefs
 * 
 * Generates sound briefs for existing mind moments that don't have them yet.
 * Runs the sound generation pipeline on the mind_moment text and updates the database.
 * 
 * Usage:
 *   node scripts/backfill-sound-briefs.js [limit]
 * 
 * Examples:
 *   node scripts/backfill-sound-briefs.js        # Process last 10 moments
 *   node scripts/backfill-sound-briefs.js 50     # Process last 50 moments
 */

import 'dotenv/config';
import { initDatabase, getPool } from '../src/db/index.js';
import { getActiveSoundPrompt, getActiveCSVs, getDefaultCSVs } from '../src/db/sound-prompts.js';
import { generateAudioSelections } from '../src/sound/generator.js';

// Get limit from command line args (default: 10)
const LIMIT = parseInt(process.argv[2]) || 10;

async function backfillSoundBriefs() {
  console.log('🎵 Sound Brief Backfill Tool');
  console.log('━'.repeat(50));
  
  // Initialize database connection
  const pool = initDatabase();
  
  if (!pool) {
    console.error('❌ Database not enabled. Set DATABASE_ENABLED=true in .env');
    process.exit(1);
  }
  
  try {
    // Step 1: Get active sound prompt
    console.log('\n📋 Checking for active sound prompt...');
    const activePrompt = await getActiveSoundPrompt();
    
    if (!activePrompt) {
      console.error('❌ No active sound prompt found.');
      console.error('   Please activate a sound prompt at /web/prompt-editor/sound');
      process.exit(1);
    }
    
    console.log(`✓ Found active prompt: "${activePrompt.name}"`);
    
    // Step 2: Get CSV files
    console.log('\n📁 Loading CSV files...');
    const csvs = await getActiveCSVs();
    const defaults = await getDefaultCSVs();
    const musicCSV = csvs.music?.content || defaults.music?.content;
    const textureCSV = csvs.texture?.content || defaults.texture?.content;
    
    if (!musicCSV || !textureCSV) {
      console.error('❌ Missing CSV files. Cannot proceed.');
      process.exit(1);
    }
    
    console.log(`✓ Music CSV loaded (${musicCSV.split('\n').length - 1} samples)`);
    console.log(`✓ Texture CSV loaded (${textureCSV.split('\n').length - 1} samples)`);
    
    // Step 3: Query mind moments without sound briefs
    console.log(`\n🔍 Fetching last ${LIMIT} mind moments...`);
    const result = await pool.query(`
      SELECT id, cycle, mind_moment, sound_brief
      FROM mind_moments
      WHERE mind_moment IS NOT NULL
        AND mind_moment != ''
        AND LENGTH(mind_moment) > 20
      ORDER BY cycle DESC
      LIMIT $1
    `, [LIMIT]);
    
    const moments = result.rows;
    console.log(`✓ Found ${moments.length} moments to process`);
    
    if (moments.length === 0) {
      console.log('\n✅ No moments to process. Exiting.');
      process.exit(0);
    }
    
    // Step 4: Process each moment
    console.log('\n━'.repeat(50));
    console.log('🎵 Starting sound brief generation...\n');
    
    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < moments.length; i++) {
      const moment = moments[i];
      const progress = `[${i + 1}/${moments.length}]`;
      
      console.log(`${progress} Cycle ${moment.cycle}`);
      console.log(`  Text: "${moment.mind_moment.substring(0, 60)}..."`);
      
      // Skip if already has sound brief
      if (moment.sound_brief) {
        console.log(`  ⏭️  Already has sound brief - skipping`);
        skipCount++;
        console.log('');
        continue;
      }
      
      try {
        // Generate sound brief with retry logic
        const startTime = Date.now();
        let soundBrief = null;
        let lastError = null;
        const maxRetries = 2;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
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
              if (attempt < maxRetries) {
                console.log(`  ⚠️  Validation failed (attempt ${attempt}/${maxRetries}): ${lastError}`);
                console.log(`     Retrying with different seed...`);
                // Brief delay before retry (500ms)
                await new Promise(resolve => setTimeout(resolve, 500));
              }
            }
          } catch (genError) {
            lastError = genError.message;
            if (attempt < maxRetries) {
              console.log(`  ⚠️  Generation error (attempt ${attempt}/${maxRetries}): ${genError.message}`);
              console.log(`     Retrying...`);
              await new Promise(resolve => setTimeout(resolve, 500));
            }
          }
        }
        
        const duration = Date.now() - startTime;
        
        if (!soundBrief || !soundBrief.valid) {
          console.log(`  ❌ Validation failed after ${maxRetries} attempts: ${lastError}`);
          errorCount++;
          console.log('');
          continue;
        }
        
        // Update database
        await pool.query(
          'UPDATE mind_moments SET sound_brief = $1 WHERE id = $2',
          [JSON.stringify(soundBrief), moment.id]
        );
        
        console.log(`  ✓ Generated in ${duration}ms`);
        console.log(`    Music: ${soundBrief.selections.music_filename}`);
        console.log(`    Texture: ${soundBrief.selections.texture_filename}`);
        successCount++;
        
      } catch (error) {
        console.log(`  ❌ Error: ${error.message}`);
        errorCount++;
      }
      
      console.log('');
      
      // Throttle: 7 second delay to respect Gemini free tier (10 RPM)
      // This allows ~8.5 calls/minute to stay safely under the limit
      if (i < moments.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 7000));
      }
    }
    
    // Summary
    console.log('━'.repeat(50));
    console.log('📊 Summary:');
    console.log(`  ✓ Success: ${successCount}`);
    console.log(`  ⏭️  Skipped: ${skipCount}`);
    console.log(`  ❌ Errors:  ${errorCount}`);
    console.log(`  📋 Total:   ${moments.length}`);
    console.log('');
    console.log('✅ Backfill complete!');
    
  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    // Close database connection
    await pool.end();
  }
}

// Run the backfill
backfillSoundBriefs();
