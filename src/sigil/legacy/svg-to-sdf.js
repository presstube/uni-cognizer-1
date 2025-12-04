/**
 * SVG to SDF (Signed Distance Field) Generator
 * Converts SVG path data to distance field texture
 * 
 * Uses svg-path-sdf for generation (requires node-canvas for server-side use)
 */

import { createCanvas } from 'canvas';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Polyfill document for svg-path-sdf (browser-only library)
if (typeof document === 'undefined') {
  global.document = {
    createElement: (tag) => {
      if (tag === 'canvas') {
        return createCanvas(256, 256);
      }
      throw new Error(`Unsupported element type: ${tag}`);
    }
  };
}

/**
 * Extract path data from SVG string
 * @param {string} svgString - SVG XML string
 * @returns {string} SVG path 'd' attribute value
 */
function extractPathFromSVG(svgString) {
  // Match path d attribute
  const pathMatch = svgString.match(/<path[^>]+d="([^"]+)"/);
  
  if (!pathMatch) {
    throw new Error('No path element found in SVG');
  }
  
  // If multiple paths, combine them
  const allPaths = [];
  const pathRegex = /<path[^>]+d="([^"]+)"/g;
  let match;
  
  while ((match = pathRegex.exec(svgString)) !== null) {
    allPaths.push(match[1]);
  }
  
  // Combine all paths with space separator
  return allPaths.join(' ');
}

/**
 * Generate SDF from SVG
 * @param {string} svgString - SVG XML string
 * @param {Object} options - Generation options
 * @param {number} options.width - Output texture width (default: 256)
 * @param {number} options.height - Output texture height (default: 256)
 * @param {Array<number>} options.viewBox - SVG viewBox [minX, minY, width, height] (default: [0, 0, 100, 100])
 * @param {number} options.strokeWidth - Stroke width for rendering (default: 2)
 * @returns {Object} { data: Uint8Array, width: number, height: number }
 */
export async function svgToSDF(svgString, options = {}) {
  const {
    width = 256,
    height = 256,
    viewBox = [0, 0, 100, 100],
    strokeWidth = 2
  } = options;
  
  if (!svgString || !svgString.trim()) {
    throw new Error('SVG string is required');
  }
  
  try {
    // Extract path data from SVG
    const pathData = extractPathFromSVG(svgString);
    
    // Try to load svg-path-sdf using require (works better for mixed module types)
    let sdf;
    try {
      // Try dynamic import first
      const sdfModule = await import('svg-path-sdf');
      sdf = sdfModule.default || sdfModule;
    } catch (importError) {
      // Fallback to require if import fails
      console.log('Dynamic import failed, trying require...');
      sdf = require('svg-path-sdf');
      if (sdf.default) sdf = sdf.default;
    }
    
    // Generate SDF using svg-path-sdf
    const sdfData = sdf(pathData, {
      width,
      height,
      viewBox,
      stroke: strokeWidth
    });
    
    // Convert to Uint8Array if not already
    const uint8Data = sdfData instanceof Uint8Array 
      ? sdfData 
      : new Uint8Array(sdfData);
    
    return {
      data: uint8Data,
      width,
      height
    };
  } catch (error) {
    throw new Error(`Failed to generate SDF from SVG: ${error.message}`);
  }
}

