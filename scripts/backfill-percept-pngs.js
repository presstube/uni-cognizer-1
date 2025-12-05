import 'dotenv/config';
import { initDatabase, getPool } from '../src/db/index.js';
import { generatePerceptPNGs } from '../src/percepts/percept-to-png.js';

async function backfillPerceptPNGs(limit = null) {
  initDatabase();
  const pool = getPool();
  
  // Query mind moments with percepts but without PNG data
  const query = limit
    ? `SELECT id, cycle, visual_percepts, audio_percepts 
       FROM mind_moments 
       WHERE (jsonb_array_length(visual_percepts) > 0 OR jsonb_array_length(audio_percepts) > 0)
       ORDER BY cycle DESC 
       LIMIT $1`
    : `SELECT id, cycle, visual_percepts, audio_percepts 
       FROM mind_moments 
       WHERE (jsonb_array_length(visual_percepts) > 0 OR jsonb_array_length(audio_percepts) > 0)
       ORDER BY cycle DESC`;
  
  const params = limit ? [limit] : [];
  const result = await pool.query(query, params);
  
  console.log(`\n🔄 Backfilling ${result.rows.length} mind moments with percept PNGs...\n`);
  
  let successCount = 0;
  let errorCount = 0;
  let totalVisualPNGs = 0;
  let totalAudioPNGs = 0;
  
  for (const row of result.rows) {
    try {
      const visualPercepts = row.visual_percepts || [];
      const audioPercepts = row.audio_percepts || [];
      
      // Generate PNGs
      const { visualPNGs, audioPNGs } = await generatePerceptPNGs(visualPercepts, audioPercepts);
      
      // Embed PNG data into percept objects
      visualPercepts.forEach((percept, i) => {
        if (visualPNGs[i]) {
          percept.pngData = visualPNGs[i].data.toString('base64');
          percept.pngWidth = visualPNGs[i].width;
          percept.pngHeight = visualPNGs[i].height;
          totalVisualPNGs++;
        }
      });
      
      audioPercepts.forEach((percept, i) => {
        if (audioPNGs[i]) {
          percept.pngData = audioPNGs[i].data.toString('base64');
          percept.pngWidth = audioPNGs[i].width;
          percept.pngHeight = audioPNGs[i].height;
          totalAudioPNGs++;
        }
      });
      
      // Update database
      await pool.query(
        `UPDATE mind_moments 
         SET visual_percepts = $1, audio_percepts = $2 
         WHERE id = $3`,
        [JSON.stringify(visualPercepts), JSON.stringify(audioPercepts), row.id]
      );
      
      successCount++;
      console.log(`✓ Cycle ${row.cycle}: ${visualPNGs.filter(p => p).length} visual + ${audioPNGs.filter(p => p).length} audio PNGs`);
      
    } catch (error) {
      errorCount++;
      console.error(`✗ Cycle ${row.cycle}: ${error.message}`);
    }
  }
  
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`📊 Complete: ${successCount} mind moments updated`);
  console.log(`   Visual PNGs: ${totalVisualPNGs}`);
  console.log(`   Audio PNGs: ${totalAudioPNGs}`);
  console.log(`   Errors: ${errorCount}`);
  console.log(`${'═'.repeat(60)}\n`);
  
  process.exit(0);
}

// Parse command line args
const limit = process.argv[2] ? parseInt(process.argv[2]) : null;

if (limit) {
  console.log(`\n📋 Testing on latest ${limit} mind moments...\n`);
} else {
  console.log(`\n📋 Backfilling ALL mind moments...\n`);
}

backfillPerceptPNGs(limit);
