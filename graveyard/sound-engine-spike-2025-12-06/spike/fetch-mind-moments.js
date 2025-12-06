/**
 * Fetch random mind moments from database for testing
 */

import 'dotenv/config';
import { initDatabase, getPool, closeDatabase } from '../../../../src/db/index.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function fetchMindMoments() {
  await initDatabase();
  const pool = getPool();
  
  try {
    const result = await pool.query(
      `SELECT mind_moment 
       FROM mind_moments 
       WHERE mind_moment IS NOT NULL 
         AND mind_moment != '' 
         AND LENGTH(mind_moment) > 20
       ORDER BY RANDOM() 
       LIMIT 30`
    );
    
    const mindMoments = result.rows.map(r => r.mind_moment);
    
    // Save to JSON file
    const outputPath = path.join(__dirname, 'test-paragraphs.json');
    await fs.writeFile(outputPath, JSON.stringify(mindMoments, null, 2));
    
    console.log(`✅ Fetched ${mindMoments.length} mind moments`);
    console.log(`📝 Saved to: ${outputPath}`);
    console.log('\nSample:');
    mindMoments.slice(0, 3).forEach((m, i) => {
      console.log(`\n${i + 1}. "${m}"`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await closeDatabase();
  }
}

fetchMindMoments();
