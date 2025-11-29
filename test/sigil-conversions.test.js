/**
 * Unit Tests for Canvas to SVG and SVG to SDF Conversions
 * Run with: node test/sigil-conversions.test.js
 */

import { canvasToSVG } from '../src/sigil/canvas-to-svg.js';
import { svgToSDF } from '../src/sigil/svg-to-sdf.js';

console.log('🧪 Testing Sigil Conversions\n');

// Test 1: Simple line conversion
console.log('Test 1: Simple line to SVG');
const simpleCanvas = `
ctx.beginPath();
ctx.moveTo(10, 10);
ctx.lineTo(90, 90);
ctx.stroke();
`;

try {
  const svg = canvasToSVG(simpleCanvas);
  console.assert(svg.includes('<svg'), '✗ Should generate SVG tag');
  console.assert(svg.includes('M 10 10'), '✗ Should include moveTo');
  console.assert(svg.includes('L 90 90'), '✗ Should include lineTo');
  console.log('✓ Simple line conversion passed');
  console.log(`  SVG length: ${svg.length} chars\n`);
} catch (error) {
  console.error('✗ Simple line test failed:', error.message);
}

// Test 2: Multiple lines
console.log('Test 2: Multiple lines to SVG');
const multiLineCanvas = `
ctx.beginPath();
ctx.moveTo(20, 20);
ctx.lineTo(80, 20);
ctx.lineTo(80, 80);
ctx.lineTo(20, 80);
ctx.closePath();
ctx.stroke();
`;

try {
  const svg = canvasToSVG(multiLineCanvas);
  console.assert(svg.includes('M 20 20'), '✗ Should include first moveTo');
  console.assert(svg.includes('L 80 20'), '✗ Should include first lineTo');
  console.assert(svg.includes('L 80 80'), '✗ Should include second lineTo');
  console.assert(svg.includes('Z'), '✗ Should include closePath');
  console.log('✓ Multiple lines conversion passed');
  console.log(`  SVG length: ${svg.length} chars\n`);
} catch (error) {
  console.error('✗ Multiple lines test failed:', error.message);
}

// Test 3: Arc conversion
console.log('Test 3: Arc to SVG');
const arcCanvas = `
ctx.beginPath();
ctx.arc(50, 50, 20, 0, Math.PI * 2);
ctx.stroke();
`;

try {
  const svg = canvasToSVG(arcCanvas);
  console.assert(svg.includes('A '), '✗ Should convert arc to SVG arc command');
  console.log('✓ Arc conversion passed');
  console.log(`  SVG length: ${svg.length} chars\n`);
} catch (error) {
  console.error('✗ Arc test failed:', error.message);
}

// Test 4: Bezier curve
console.log('Test 4: Bezier curve to SVG');
const bezierCanvas = `
ctx.beginPath();
ctx.moveTo(10, 50);
ctx.bezierCurveTo(30, 10, 70, 10, 90, 50);
ctx.stroke();
`;

try {
  const svg = canvasToSVG(bezierCanvas);
  console.assert(svg.includes('C '), '✗ Should include cubic bezier command');
  console.log('✓ Bezier curve conversion passed');
  console.log(`  SVG length: ${svg.length} chars\n`);
} catch (error) {
  console.error('✗ Bezier curve test failed:', error.message);
}

// Test 5: Quadratic curve
console.log('Test 5: Quadratic curve to SVG');
const quadraticCanvas = `
ctx.beginPath();
ctx.moveTo(10, 50);
ctx.quadraticCurveTo(50, 10, 90, 50);
ctx.stroke();
`;

try {
  const svg = canvasToSVG(quadraticCanvas);
  console.assert(svg.includes('Q '), '✗ Should include quadratic curve command');
  console.log('✓ Quadratic curve conversion passed');
  console.log(`  SVG length: ${svg.length} chars\n`);
} catch (error) {
  console.error('✗ Quadratic curve test failed:', error.message);
}

// Test 6: SVG to SDF conversion
console.log('Test 6: SVG to SDF');
const testSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">
  <path d="M 10 10 L 90 90" fill="none" stroke="white" stroke-width="2"/>
</svg>`;

try {
  const sdf = await svgToSDF(testSVG, { width: 64, height: 64 });
  console.assert(sdf.width === 64, '✗ Should match requested width');
  console.assert(sdf.height === 64, '✗ Should match requested height');
  console.assert(sdf.data.length === 64 * 64, '✗ Should have correct data size');
  console.assert(sdf.data instanceof Uint8Array, '✗ Data should be Uint8Array');
  console.log('✓ SVG to SDF conversion passed');
  console.log(`  SDF: ${sdf.width}×${sdf.height} (${sdf.data.length} bytes)\n`);
} catch (error) {
  console.error('✗ SVG to SDF test failed:', error.message);
}

// Test 7: Full pipeline (Canvas → SVG → SDF)
console.log('Test 7: Full pipeline');
const fullCanvas = `
ctx.beginPath();
ctx.arc(50, 50, 30, 0, Math.PI * 2);
ctx.stroke();
ctx.beginPath();
ctx.moveTo(35, 45);
ctx.arc(35, 45, 3, 0, Math.PI * 2);
ctx.fill();
ctx.beginPath();
ctx.moveTo(65, 45);
ctx.arc(65, 45, 3, 0, Math.PI * 2);
ctx.fill();
`;

try {
  const svg = canvasToSVG(fullCanvas);
  const sdf = await svgToSDF(svg, { width: 128, height: 128 });
  
  console.log('✓ Full pipeline passed');
  console.log(`  Canvas → SVG: ${svg.length} chars`);
  console.log(`  SVG → SDF: ${sdf.width}×${sdf.height} (${sdf.data.length} bytes)\n`);
} catch (error) {
  console.error('✗ Full pipeline test failed:', error.message);
}

console.log('✅ All tests completed!');

