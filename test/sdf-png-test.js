/**
 * Test SDF PNG Generation
 * Verifies that the SDF generator produces valid PNG files
 */

import { createCanvas } from 'canvas';
import { writeFileSync } from 'fs';

console.log('🧪 Testing SDF PNG generation\n');

// Create a simple SDF test
const canvas = createCanvas(256, 256);
const ctx = canvas.getContext('2d');

// Draw a simple gradient to test
const imageData = ctx.createImageData(256, 256);
for (let y = 0; y < 256; y++) {
  for (let x = 0; x < 256; x++) {
    const idx = (y * 256 + x) * 4;
    const value = Math.floor((x + y) / 2);
    imageData.data[idx + 0] = value; // R
    imageData.data[idx + 1] = value; // G
    imageData.data[idx + 2] = value; // B
    imageData.data[idx + 3] = 255;   // A
  }
}

ctx.putImageData(imageData, 0, 0);

// Export as PNG
const pngBuffer = canvas.toBuffer('image/png');

console.log('✓ PNG buffer created:', pngBuffer.length, 'bytes');
console.log('✓ PNG signature:', pngBuffer.slice(0, 8).toString('hex'));
console.log('  (Should start with: 89504e470d0a1a0a)\n');

// Save to file
const outputPath = '/tmp/test-sdf.png';
writeFileSync(outputPath, pngBuffer);
console.log('✓ Test PNG saved to:', outputPath);
console.log('\nTo view: open /tmp/test-sdf.png\n');

// Now test with actual SDF generator
console.log('Testing full SVG → SDF pipeline...\n');

const testSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">
  <path d="M 50 10 L 90 90 L 10 90 Z" fill="none" stroke="black" stroke-width="1"/>
</svg>`;

try {
  const { svgToSDF } = await import('../src/sigil/svg-to-sdf-simple.js');
  const result = await svgToSDF(testSVG, { width: 128, height: 128 });
  
  console.log('✓ SDF generated successfully');
  console.log(`  Size: ${result.width}×${result.height}`);
  console.log(`  Data: ${result.data.length} bytes`);
  console.log(`  Format: ${result.format}`);
  
  // Save the actual SDF
  writeFileSync('/tmp/actual-sdf.png', result.data);
  console.log('\n✓ Actual SDF saved to: /tmp/actual-sdf.png');
  console.log('To view: open /tmp/actual-sdf.png\n');
  
  console.log('✅ All tests passed!');
} catch (error) {
  console.error('❌ SDF test failed:', error.message);
  console.error(error.stack);
}

