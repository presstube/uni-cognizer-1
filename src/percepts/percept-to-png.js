/**
 * Percept PNG Generation
 * Renders percept canvas drawing code to 256×256 PNG icons
 */

import { canvasToPNG } from '../sigil/canvas-to-png.js';

/**
 * Generate PNG from percept canvas code
 * @param {Object} percept - Visual or audio percept with drawCalls/sigilDrawCalls
 * @returns {Promise<Object>} { data: Buffer, width: 256, height: 256, format: 'png' }
 */
export async function perceptToPNG(percept) {
  const canvasCode = percept.drawCalls || percept.sigilDrawCalls;
  
  if (!canvasCode) {
    throw new Error('Percept has no canvas drawing code');
  }
  
  return await canvasToPNG(canvasCode, {
    width: 256,
    height: 256,
    canvasWidth: 100,
    canvasHeight: 100,
    strokeWidth: 1.5,  // Slightly thicker for smaller size
    scale: 1.0
  });
}

/**
 * Generate PNGs for all percepts in a mind moment
 * @param {Array} visualPercepts - Array of visual percepts
 * @param {Array} audioPercepts - Array of audio percepts
 * @returns {Promise<Object>} { visualPNGs: Buffer[], audioPNGs: Buffer[] }
 */
export async function generatePerceptPNGs(visualPercepts = [], audioPercepts = []) {
  const visualPNGs = [];
  const audioPNGs = [];
  
  // Generate visual percept PNGs
  for (const percept of visualPercepts) {
    try {
      const png = await perceptToPNG(percept);
      visualPNGs.push(png);
    } catch (error) {
      console.warn(`Failed to generate PNG for visual percept:`, error.message);
      visualPNGs.push(null);
    }
  }
  
  // Generate audio percept PNGs
  for (const percept of audioPercepts) {
    try {
      const png = await perceptToPNG(percept);
      audioPNGs.push(png);
    } catch (error) {
      console.warn(`Failed to generate PNG for audio percept:`, error.message);
      audioPNGs.push(null);
    }
  }
  
  return { visualPNGs, audioPNGs };
}
