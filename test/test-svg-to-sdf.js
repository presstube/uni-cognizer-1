/**
 * Test SVG to SDF PNG conversion
 */

import { readFileSync, writeFileSync } from 'fs';
import { svgToSDF } from '../src/sigil/svg-to-sdf-simple.js';

const svgFile = process.argv[2] || 'test/sigil-109.svg';
const outputFile = svgFile.replace('.svg', '-sdf.png');

console.log('🧪 Testing SVG → SDF PNG conversion\n');

// Read the SVG file
const svgContent = readFileSync(svgFile, 'utf-8');
console.log('✓ Loaded SVG:', svgFile);
console.log(`  Size: ${svgContent.length} chars\n`);

// Convert to SDF
console.log('🔄 Converting to SDF...');
const startTime = Date.now();

try {
  const sdfResult = await svgToSDF(svgContent, { 
    width: 256, 
    height: 256 
  });
  
  const duration = Date.now() - startTime;
  
  console.log(`✓ SDF generated in ${duration}ms`);
  console.log(`  Format: ${sdfResult.format}`);
  console.log(`  Dimensions: ${sdfResult.width}×${sdfResult.height}`);
  console.log(`  Data size: ${sdfResult.data.length} bytes`);
  console.log(`  Data type: ${sdfResult.data.constructor.name}`);
  
  // Check PNG signature
  const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const hasValidSignature = pngSignature.equals(sdfResult.data.slice(0, 8));
  console.log(`  Valid PNG signature: ${hasValidSignature ? '✓' : '✗'}`);
  
  if (hasValidSignature) {
    console.log(`  PNG header: ${sdfResult.data.slice(0, 8).toString('hex')}`);
  }
  
  // Save to file
  writeFileSync(outputFile, sdfResult.data);
  console.log(`\n✓ Saved to: ${outputFile}`);
  
  console.log('\n✅ Test passed! Open the file to verify:');
  console.log(`   open ${outputFile}`);
  
} catch (error) {
  console.error('❌ Test failed:', error.message);
  console.error(error.stack);
  process.exit(1);
}

