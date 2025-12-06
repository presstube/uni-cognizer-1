/**
 * UNI Audio Instrument - CLI Test Runner
 * 
 * Tests audio selection generation with various paragraphs
 */

import 'dotenv/config';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateAudioSelections } from './generator.js';
import { validateSelections, parseCSV } from './validator.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Test paragraphs from implementation plan
const TEST_CASES = {
  melancholic: "The old lighthouse stood silent against the storm. Inside, a single lamp flickered, casting long shadows that danced like memories.",
  energetic: "The city buzzed with electric energy. Neon signs flashed, footsteps echoed rapid-fire on concrete, and somewhere distant, a saxophone wailed against the night.",
  contemplative: "Morning mist settled over the lake. A lone bird called out, its voice rippling across the glassy surface. Everything felt suspended, waiting.",
  technological: "Data streams flowed through invisible channels. The hum of processors created a strange music—mathematical, precise, yet somehow alive."
};

/**
 * Run a single test with given paragraph
 */
async function runTest(paragraph, options = {}) {
  console.log('\n' + '='.repeat(80));
  console.log('🎵 UNI Audio Instrument - Test');
  console.log('='.repeat(80));
  console.log('\nInput paragraph:');
  console.log(`"${paragraph}"`);
  console.log('\n' + '-'.repeat(80));
  
  try {
    const startTime = Date.now();
    
    // Generate
    console.log('⏳ Generating selections...');
    const output = await generateAudioSelections(paragraph, options);
    
    const duration = Date.now() - startTime;
    console.log(`✅ Generated in ${duration}ms\n`);
    
    console.log('Raw LLM output:');
    console.log(output);
    console.log('\n' + '-'.repeat(80));
    
    // Load CSVs for validation
    const musicCSV = await fs.readFile(
      path.join(__dirname, '..', 'music_samples.csv'),
      'utf-8'
    );
    const textureCSV = await fs.readFile(
      path.join(__dirname, '..', 'texture_samples.csv'),
      'utf-8'
    );
    
    const musicSamples = parseCSV(musicCSV);
    const textureSamples = parseCSV(textureCSV);
    
    // Validate
    const validation = validateSelections(output, musicSamples, textureSamples);
    
    console.log('\n' + '='.repeat(80));
    if (validation.valid) {
      console.log('✅ VALIDATION PASSED');
      console.log('='.repeat(80));
      
      // Show reasoning first if present
      if (validation.reasoning) {
        console.log('\n💭 Reasoning:');
        console.log(`  ${validation.reasoning}`);
      }
      
      console.log('\nSelections:');
      
      // Pretty print selections
      const s = validation.selections;
      console.log(`\nMusic & Texture:`);
      console.log(`  music_filename:   ${s.music_filename}`);
      console.log(`  texture_filename: ${s.texture_filename}`);
      
      console.log(`\nBass Configuration:`);
      console.log(`  bass_preset:      ${s.bass_preset}`);
      console.log(`  bass_speed:       ${s.bass_speed}`);
      console.log(`  bass_stability:   ${s.bass_stability}`);
      console.log(`  bass_coloration:  ${s.bass_coloration}`);
      console.log(`  bass_scale:       ${s.bass_scale}`);
      
      console.log(`\nMelody Configuration:`);
      console.log(`  melody_speed:       ${s.melody_speed}`);
      console.log(`  melody_stability:   ${s.melody_stability}`);
      console.log(`  melody_coloration:  ${s.melody_coloration}`);
      console.log(`  melody_scale:       ${s.melody_scale}`);
      
      // Show context about selected samples
      const music = musicSamples.find(m => m.filename === s.music_filename);
      const texture = textureSamples.find(t => t.filename === s.texture_filename);
      
      if (music) {
        console.log(`\nSelected Music Sample:`);
        console.log(`  Description: ${music.description}`);
        console.log(`  Tone: ${music.tone}, Density: ${music.density}, Mood: ${music.mood}`);
        console.log(`  Scale: ${music.scale}, Rhythm: ${music.rhythm}`);
      }
      
      if (texture) {
        console.log(`\nSelected Texture Sample:`);
        console.log(`  Description: ${texture.description}`);
        console.log(`  Category: ${texture.category}, Tone: ${texture.tone}`);
      }
      
    } else {
      console.log('❌ VALIDATION FAILED');
      console.log('='.repeat(80));
      console.log('\nErrors:');
      validation.errors.forEach(err => console.log(`  ❌ ${err}`));
      
      console.log('\nParsed selections (may be incomplete):');
      console.log(JSON.stringify(validation.selections, null, 2));
    }
    
    console.log('\n');
    return validation;
    
  } catch (error) {
    console.error('\n❌ Test failed with error:');
    console.error(error.message);
    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    throw error;
  }
}

/**
 * Main CLI interface
 */
async function main() {
  const args = process.argv.slice(2);
  
  // Show help
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
UNI Audio Instrument - Test Runner

Usage:
  node test.js [options] [paragraph]
  node test.js --test-case <case-name>
  node test.js --all

Options:
  --test-case <name>  Use predefined test case
  --all               Run all test cases
  --temperature <n>   Set LLM temperature (default: 0.7)
  --help, -h          Show this help

Test Cases:
  melancholic         Sad, calm, sparse
  energetic           Upbeat, dense, intense
  contemplative       Natural, suspended, waiting
  technological       Digital, abstract, precise

Examples:
  node test.js --test-case melancholic
  node test.js --all
  node test.js "She walked through foggy streets..."
  node test.js --temperature 0.3 --test-case energetic
`);
    return;
  }
  
  // Parse options
  const options = {};
  let paragraph = null;
  let testCase = null;
  let runAll = false;
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--temperature' && args[i + 1]) {
      options.temperature = parseFloat(args[i + 1]);
      i++;
    } else if (args[i] === '--test-case' && args[i + 1]) {
      testCase = args[i + 1];
      i++;
    } else if (args[i] === '--all') {
      runAll = true;
    } else if (!args[i].startsWith('--')) {
      paragraph = args.slice(i).join(' ');
      break;
    }
  }
  
  // Run all test cases
  if (runAll) {
    console.log('\n🎵 Running all test cases...\n');
    const results = [];
    
    for (const [name, text] of Object.entries(TEST_CASES)) {
      console.log(`\n${'*'.repeat(80)}`);
      console.log(`TEST CASE: ${name.toUpperCase()}`);
      console.log('*'.repeat(80));
      
      const result = await runTest(text, options);
      results.push({ name, valid: result.valid });
      
      // Pause between tests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Summary
    console.log('\n' + '='.repeat(80));
    console.log('📊 SUMMARY');
    console.log('='.repeat(80));
    const passed = results.filter(r => r.valid).length;
    const total = results.length;
    console.log(`\nPassed: ${passed}/${total} (${Math.round(passed/total*100)}%)`);
    console.log('\nResults:');
    results.forEach(r => {
      const icon = r.valid ? '✅' : '❌';
      console.log(`  ${icon} ${r.name}`);
    });
    console.log('\n');
    
    return;
  }
  
  // Run single test
  if (testCase) {
    paragraph = TEST_CASES[testCase];
    if (!paragraph) {
      console.error(`\n❌ Unknown test case: ${testCase}`);
      console.log('Available:', Object.keys(TEST_CASES).join(', '));
      console.log('Run with --help for more info\n');
      process.exit(1);
    }
  }
  
  // Default to melancholic if no input
  if (!paragraph) {
    paragraph = TEST_CASES.melancholic;
    console.log('\n💡 No input provided, using default test case: melancholic');
  }
  
  await runTest(paragraph, options);
}

// Run
main().catch(error => {
  console.error('\n💥 Fatal error:', error.message);
  process.exit(1);
});
