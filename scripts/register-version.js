#!/usr/bin/env node

import 'dotenv/config';
import { getPool } from '../src/db/index.js';
import { COGNIZER_VERSION } from '../src/version.js';

/**
 * Version Registration Script
 * 
 * Registers the current Cognizer version in the database.
 * Run this when deploying a new version to track:
 * - Version number
 * - Release timestamp
 * - Release notes
 * 
 * Usage:
 *   npm run version:register
 *   npm run version:register -- --notes "Added personality system"
 */

async function registerVersion() {
  const pool = getPool();
  
  // Get release notes from command line args
  const args = process.argv.slice(2);
  const notesIndex = args.indexOf('--notes');
  const notes = notesIndex >= 0 && args[notesIndex + 1] 
    ? args[notesIndex + 1]
    : `Version ${COGNIZER_VERSION} deployed`;
  
  try {
    // Check if version already exists
    const existingResult = await pool.query(
      'SELECT version, released_at FROM cognizer_versions WHERE version = $1',
      [COGNIZER_VERSION]
    );
    
    if (existingResult.rows.length > 0) {
      const existing = existingResult.rows[0];
      console.log(`⚠️  Version ${COGNIZER_VERSION} already registered`);
      console.log(`   Released: ${existing.released_at}`);
      console.log(`   Skipping registration (versions are immutable)`);
      process.exit(0);
    }
    
    // Insert new version
    const result = await pool.query(`
      INSERT INTO cognizer_versions (version, notes)
      VALUES ($1, $2)
      RETURNING version, released_at
    `, [COGNIZER_VERSION, notes]);
    
    const registered = result.rows[0];
    
    console.log(`✅ Version registered successfully!`);
    console.log(`   Version: ${registered.version}`);
    console.log(`   Released: ${registered.released_at}`);
    console.log(`   Notes: ${notes}`);
    
  } catch (error) {
    console.error(`❌ Failed to register version:`, error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

registerVersion();

