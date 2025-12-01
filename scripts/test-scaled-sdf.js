import 'dotenv/config';
import { initDatabase, getPool } from '../src/db/index.js';
import { canvasToSDF } from '../src/sigil/canvas-to-sdf.js';

async function testScaledSDF() {
  initDatabase();
  const pool = getPool();
  
  console.log('\n🧪 Testing scaled SDF generation for Cycle 70\n');
  console.log('═'.repeat(80));
  
  try {
    // Get cycle 70
    const result = await pool.query(`
      SELECT id, cycle, sigil_code, sigil_phrase
      FROM mind_moments
      WHERE cycle = 70
      LIMIT 1
    `);
    
    if (result.rows.length === 0) {
      console.log('❌ No moment found for Cycle 70');
      await pool.end();
      process.exit(1);
    }
    
    const row = result.rows[0];
    console.log(`Found Cycle ${row.cycle}: "${row.sigil_phrase}"`);
    console.log(`Sigil code: ${row.sigil_code.length} chars\n`);
    
    // Generate SDF with 0.75x scale (centered in 512x512)
    console.log('Generating SDF at 512×512 resolution with 0.75x scale...');
    
    const sigilSDF = await canvasToSDF(row.sigil_code, {
      width: 512,
      height: 512,
      canvasWidth: 100,
      canvasHeight: 100,
      strokeWidth: 2,
      scale: 0.75  // Scale down the artwork
    });
    
    console.log(`✓ Generated ${sigilSDF.width}×${sigilSDF.height} SDF`);
    console.log(`  Size: ${sigilSDF.data.length} bytes`);
    
    // Save to test file
    const fs = await import('fs');
    const testPath = './test/cycle-70-scaled-sdf.png';
    fs.writeFileSync(testPath, sigilSDF.data);
    
    console.log(`\n✓ Saved test SDF to: ${testPath}`);
    console.log(`\nCompare this with the original to see if the gradient is preserved!\n`);
    console.log('═'.repeat(80) + '\n');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

testScaledSDF();

