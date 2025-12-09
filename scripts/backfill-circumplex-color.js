#!/usr/bin/env node

/**
 * Backfill Script: Circumplex & Color for Historical Mind Moments
 * 
 * This script:
 * 1. Finds mind moments missing circumplex or color
 * 2. Generates random circumplex for moments without it
 * 3. Generates color triads from circumplex values
 * 4. Updates the database
 * 
 * Usage:
 *   node scripts/backfill-circumplex-color.js [--dry-run] [--limit=N]
 * 
 * Options:
 *   --dry-run    Show what would be updated without making changes
 *   --limit=N    Only process N moments (default: 10 for testing)
 */

import 'dotenv/config';
import { getPool, initDatabase } from '../src/db/index.js';
import { circumplexToColor, ETHEREAL_VAPOUR_PALETTE } from '../src/circumplex-to-color.js';

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const limitArg = args.find(arg => arg.startsWith('--limit='));
const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : null; // No default limit

/**
 * Generate random circumplex coordinates
 * @returns {Object} { valence: -1 to +1, arousal: -1 to +1 }
 */
function generateRandomCircumplex() {
  return {
    valence: (Math.random() * 2) - 1,  // Random number between -1.0 and +1.0
    arousal: (Math.random() * 2) - 1   // Random number between -1.0 and +1.0
  };
}

async function backfillCircumplexColor() {
  console.log('🎨 Circumplex & Color Backfill Script');
  console.log('═'.repeat(60));
  
  if (isDryRun) {
    console.log('⚠️  DRY RUN MODE - No changes will be made\n');
  }
  
  if (process.env.DATABASE_ENABLED !== 'true') {
    console.error('❌ Database not enabled in environment');
    process.exit(1);
  }
  
  // Initialize database connection
  const pool = initDatabase();
  
  if (!pool) {
    console.error('❌ Failed to initialize database connection');
    process.exit(1);
  }
  
  try {
    // Step 1: Analyze database state
    console.log('📊 Analyzing database...\n');
    
    const statsResult = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(circumplex) as with_circumplex,
        COUNT(color) as with_color,
        COUNT(*) FILTER (WHERE circumplex IS NULL) as null_circumplex,
        COUNT(*) FILTER (
          WHERE circumplex->>'valence' = '0' AND circumplex->>'arousal' = '0'
        ) as neutral_circumplex,
        COUNT(*) FILTER (WHERE circumplex IS NOT NULL AND color IS NULL) as needs_color_only
      FROM mind_moments
      WHERE session_id = 'uni'
    `);
    
    const stats = statsResult.rows[0];
    console.log(`Total moments: ${stats.total}`);
    console.log(`With circumplex: ${stats.with_circumplex}`);
    console.log(`With color: ${stats.with_color}`);
    console.log(`Null circumplex: ${stats.null_circumplex}`);
    console.log(`Neutral (0,0) circumplex: ${stats.neutral_circumplex}`);
    console.log(`Needs color only: ${stats.needs_color_only}\n`);
    
    const needsProcessing = parseInt(stats.null_circumplex) + 
                           parseInt(stats.neutral_circumplex) + 
                           parseInt(stats.needs_color_only);
    
    if (needsProcessing === 0) {
      console.log('✅ All moments already have non-neutral circumplex and color!');
      process.exit(0);
    }
    
    // Step 2: Fetch moments that need processing
    // Include moments with NULL circumplex, neutral (0,0) circumplex, or missing color
    const query = `
      SELECT id, cycle, circumplex, color
      FROM mind_moments
      WHERE session_id = 'uni'
        AND (
          circumplex IS NULL 
          OR (circumplex->>'valence' = '0' AND circumplex->>'arousal' = '0')
          OR color IS NULL
        )
      ORDER BY cycle DESC
      ${limit ? `LIMIT ${limit}` : ''}
    `;
    
    const momentsResult = await pool.query(query, limit ? [limit] : []);
    const moments = momentsResult.rows;
    
    console.log(`🔄 Processing ${moments.length} moments (latest first)...\n`);
    
    // Step 3: Process each moment
    let processedCount = 0;
    let randomCircumplexCount = 0;
    let colorsGeneratedCount = 0;
    let errorCount = 0;
    
    const startTime = Date.now();
    
    for (const moment of moments) {
      try {
        let circumplex = moment.circumplex;
        let needsCircumplexUpdate = false;
        let wasRandom = false;
        
        // Parse circumplex if it exists (might be string or object)
        if (circumplex) {
          circumplex = typeof circumplex === 'string' 
            ? JSON.parse(circumplex)
            : circumplex;
        }
        
        // Check if circumplex is NULL or neutral (0, 0)
        const isNullOrNeutral = !circumplex || 
                                (circumplex.valence === 0 && circumplex.arousal === 0);
        
        if (isNullOrNeutral) {
          // Generate random circumplex to replace NULL or neutral
          circumplex = generateRandomCircumplex();
          needsCircumplexUpdate = true;
          wasRandom = true;
          randomCircumplexCount++;
        }
        
        // Generate color from circumplex
        const color = circumplexToColor(circumplex, ETHEREAL_VAPOUR_PALETTE);
        colorsGeneratedCount++;
        
        // Display what we're doing
        const prefix = wasRandom ? '[RANDOM]' : '[EXISTS]';
        const valence = circumplex.valence.toFixed(2);
        const arousal = circumplex.arousal.toFixed(2);
        
        if (isDryRun) {
          console.log(`[DRY RUN] Cycle ${moment.cycle}: ${prefix} valence=${valence}, arousal=${arousal}`);
          console.log(`          → ${color.primary}, ${color.secondary}, ${color.accent}`);
        } else {
          // Update database
          if (needsCircumplexUpdate) {
            await pool.query(
              'UPDATE mind_moments SET circumplex = $1, color = $2 WHERE id = $3',
              [JSON.stringify(circumplex), JSON.stringify(color), moment.id]
            );
          } else {
            await pool.query(
              'UPDATE mind_moments SET color = $1 WHERE id = $2',
              [JSON.stringify(color), moment.id]
            );
          }
          
          console.log(`✓ Cycle ${moment.cycle}: ${prefix} valence=${valence}, arousal=${arousal} → ${color.primary}`);
        }
        
        processedCount++;
        
      } catch (error) {
        console.error(`❌ Cycle ${moment.cycle}: ${error.message}`);
        errorCount++;
      }
    }
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    
    // Step 4: Summary
    console.log('\n' + '═'.repeat(60));
    console.log('📋 Summary:');
    console.log(`  ✅ Processed: ${processedCount}`);
    console.log(`  🎲 Random circumplex: ${randomCircumplexCount}`);
    console.log(`  🎨 Colors generated: ${colorsGeneratedCount}`);
    console.log(`  ❌ Errors: ${errorCount}`);
    console.log(`  ⏱️  Time: ${duration}s`);
    
    if (isDryRun) {
      console.log('\n⚠️  This was a dry run - no changes were made');
      console.log('Run without --dry-run to apply changes');
    } else {
      console.log(`\n✅ Backfill complete!`);
    }
    
  } catch (error) {
    console.error('❌ Backfill failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the backfill
backfillCircumplexColor();
