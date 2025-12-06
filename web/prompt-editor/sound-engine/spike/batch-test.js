/**
 * UNI Audio Instrument - Batch Test Runner
 * 
 * Tests audio selection generation with paragraphs from database
 */

import 'dotenv/config';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateAudioSelections } from './generator.js';
import { validateSelections, parseCSV } from './validator.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Run batch tests on multiple paragraphs
 */
async function batchTest(options = {}) {
  const testFile = options.testFile || 'test-paragraphs.json';
  const temperature = options.temperature ?? 0.7;
  
  console.log('\n' + '='.repeat(80));
  console.log('🎵 UNI Audio Instrument - Batch Test');
  console.log('='.repeat(80));
  console.log(`Test file: ${testFile}`);
  console.log(`Temperature: ${temperature}`);
  console.log('='.repeat(80) + '\n');
  
  // Load test paragraphs
  const paragraphsPath = path.join(__dirname, testFile);
  const paragraphs = JSON.parse(await fs.readFile(paragraphsPath, 'utf-8'));
  
  console.log(`📝 Loaded ${paragraphs.length} test paragraphs\n`);
  
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
  
  // Track statistics
  const results = [];
  const stats = {
    total: paragraphs.length,
    passed: 0,
    failed: 0,
    scaleViolations: 0,
    formatErrors: 0,
    otherErrors: 0,
    totalTime: 0,
    bassPresets: {},
    musicSamples: {},
    textureSamples: {},
  };
  
  // Test each paragraph
  for (let i = 0; i < paragraphs.length; i++) {
    const paragraph = paragraphs[i];
    const testNum = i + 1;
    
    console.log(`\n${'─'.repeat(80)}`);
    console.log(`Test ${testNum}/${paragraphs.length}`);
    console.log('─'.repeat(80));
    console.log(`Input: "${paragraph.substring(0, 80)}${paragraph.length > 80 ? '...' : ''}"`);
    
    try {
      const startTime = Date.now();
      
      // Generate
      const output = await generateAudioSelections(paragraph, { temperature });
      const duration = Date.now() - startTime;
      stats.totalTime += duration;
      
      // Validate
      const validation = validateSelections(output, musicSamples, textureSamples);
      
      if (validation.valid) {
        console.log(`✅ PASS (${duration}ms)`);
        stats.passed++;
        
        // Track selections
        const s = validation.selections;
        stats.bassPresets[s.bass_preset] = (stats.bassPresets[s.bass_preset] || 0) + 1;
        stats.musicSamples[s.music_filename] = (stats.musicSamples[s.music_filename] || 0) + 1;
        stats.textureSamples[s.texture_filename] = (stats.textureSamples[s.texture_filename] || 0) + 1;
        
      } else {
        console.log(`❌ FAIL (${duration}ms)`);
        stats.failed++;
        
        // Categorize errors
        const hasScaleError = validation.errors.some(e => e.includes('Scale mismatch'));
        const hasFormatError = validation.errors.some(e => 
          e.includes('Missing field') || 
          e.includes('must be 0.0-1.0') ||
          e.includes('Invalid')
        );
        
        if (hasScaleError) stats.scaleViolations++;
        if (hasFormatError) stats.formatErrors++;
        if (!hasScaleError && !hasFormatError) stats.otherErrors++;
        
        console.log('  Errors:');
        validation.errors.forEach(err => console.log(`    - ${err}`));
      }
      
      // Store result
      results.push({
        paragraph: paragraph.substring(0, 100),
        valid: validation.valid,
        duration,
        reasoning: validation.reasoning || null,
        selections: validation.valid ? validation.selections : null,
        errors: validation.errors
      });
      
      // Pause between requests to avoid rate limiting
      // Gemini 2.0 Flash Exp has 10 req/min limit, so use 6.5s delay (9 req/min safe)
      // Other providers (GPT-4o, Claude) can use shorter delays
      if (i < paragraphs.length - 1) {
        const delay = options.delay ?? 6500; // Default 6.5s for Gemini
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
    } catch (error) {
      console.log(`❌ ERROR: ${error.message}`);
      stats.failed++;
      stats.otherErrors++;
      
      results.push({
        paragraph: paragraph.substring(0, 100),
        valid: false,
        error: error.message
      });
    }
  }
  
  // Print summary
  console.log('\n' + '='.repeat(80));
  console.log('📊 BATCH TEST SUMMARY');
  console.log('='.repeat(80));
  
  const successRate = (stats.passed / stats.total * 100).toFixed(1);
  const avgTime = (stats.totalTime / stats.total).toFixed(0);
  
  console.log(`\n✅ Passed: ${stats.passed}/${stats.total} (${successRate}%)`);
  console.log(`❌ Failed: ${stats.failed}/${stats.total}`);
  console.log(`   - Scale violations: ${stats.scaleViolations}`);
  console.log(`   - Format errors: ${stats.formatErrors}`);
  console.log(`   - Other errors: ${stats.otherErrors}`);
  console.log(`⏱️  Average time: ${avgTime}ms`);
  
  // Bass preset distribution
  console.log('\n🎸 Bass Preset Distribution:');
  Object.entries(stats.bassPresets)
    .sort((a, b) => b[1] - a[1])
    .forEach(([preset, count]) => {
      const pct = (count / stats.passed * 100).toFixed(0);
      console.log(`   ${preset.padEnd(20)} ${count} (${pct}%)`);
    });
  
  // Top music samples
  console.log('\n🎵 Top 5 Music Samples:');
  Object.entries(stats.musicSamples)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .forEach(([sample, count]) => {
      console.log(`   ${sample.padEnd(20)} ${count}`);
    });
  
  // Top texture samples
  console.log('\n🔊 Top 5 Texture Samples:');
  Object.entries(stats.textureSamples)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .forEach(([sample, count]) => {
      console.log(`   ${sample.padEnd(20)} ${count}`);
    });
  
  // Save detailed results
  const resultsPath = path.join(__dirname, 'batch-results.json');
  await fs.writeFile(resultsPath, JSON.stringify({ stats, results }, null, 2));
  console.log(`\n💾 Detailed results saved to: batch-results.json`);
  
  console.log('\n' + '='.repeat(80));
  
  // Return stats for programmatic use
  return { stats, results };
}

/**
 * Main CLI interface
 */
async function main() {
  const args = process.argv.slice(2);
  
  const options = {};
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--temperature' && args[i + 1]) {
      options.temperature = parseFloat(args[i + 1]);
      i++;
    } else if (args[i] === '--file' && args[i + 1]) {
      options.testFile = args[i + 1];
      i++;
    } else if (args[i] === '--delay' && args[i + 1]) {
      options.delay = parseInt(args[i + 1]);
      i++;
    } else if (args[i] === '--help' || args[i] === '-h') {
      console.log(`
UNI Audio Instrument - Batch Test Runner

Usage:
  node batch-test.js [options]

Options:
  --file <path>       JSON file with test paragraphs (default: test-paragraphs.json)
  --temperature <n>   LLM temperature (default: 0.7)
  --delay <ms>        Delay between requests in ms (default: 6500 for rate limits)
  --help, -h          Show this help

Examples:
  node batch-test.js
  node batch-test.js --temperature 0.3
  node batch-test.js --file custom-tests.json
  node batch-test.js --delay 1000  # Faster for GPT-4o/Claude
`);
      return;
    }
  }
  
  await batchTest(options);
}

main().catch(error => {
  console.error('\n💥 Fatal error:', error.message);
  process.exit(1);
});
