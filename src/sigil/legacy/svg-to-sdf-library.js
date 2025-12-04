/**
 * SVG to SDF (Signed Distance Field) Generator
 * Uses the real svg-path-sdf library with proper browser polyfills
 */

// CRITICAL: Load browser polyfills FIRST
import { ensureBrowserAPIs } from './browser-polyfill.js';
ensureBrowserAPIs();

// Now import svg-path-sdf after polyfills are in place
import pathSdf from 'svg-path-sdf';

/**
 * Extract path data from SVG string
 */
function extractPathFromSVG(svgString) {
  const pathMatch = svgString.match(/<path[^>]+d="([^"]+)"/);
  if (!pathMatch) throw new Error('No path element found in SVG');
  
  const allPaths = [];
  const pathRegex = /<path[^>]+d="([^"]+)"/g;
  let match;
  while ((match = pathRegex.exec(svgString)) !== null) {
    allPaths.push(match[1]);
  }
  return allPaths.join(' ');
}

/**
 * Generate SDF from SVG using svg-path-sdf library
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
    
    // Generate SDF using svg-path-sdf (now with proper browser polyfills)
    const sdfData = pathSdf(pathData, {
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

