/**
 * Canvas to PNG - Simple rasterization
 * Converts canvas drawing code to 512×512 transparent PNG with white lines
 */

import { createCanvas } from 'canvas';

/**
 * Generate PNG from canvas drawing code
 * @param {string} canvasCode - JavaScript code that draws on canvas context
 * @param {Object} options - Generation options
 * @param {number} options.width - Output width (default: 512)
 * @param {number} options.height - Output height (default: 512)
 * @param {number} options.canvasWidth - Canvas coordinate width (default: 100)
 * @param {number} options.canvasHeight - Canvas coordinate height (default: 100)
 * @param {number} options.strokeWidth - Line width (default: 2)
 * @param {number} options.scale - Scale factor for artwork (default: 0.75)
 * @returns {Promise<Object>} { data: Buffer (PNG), width: number, height: number, format: 'png' }
 */
export async function canvasToPNG(canvasCode, options = {}) {
  const {
    width = 512,
    height = 512,
    canvasWidth = 100,
    canvasHeight = 100,
    strokeWidth = 1.0,
    scale = 1.0  // Full scale
  } = options;
  
  if (!canvasCode || !canvasCode.trim()) {
    throw new Error('Canvas code is required');
  }
  
  try {
    // Create canvas
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    
    // Transparent background
    ctx.clearRect(0, 0, width, height);
    
    // White drawing style
    ctx.fillStyle = 'white';
    ctx.strokeStyle = 'white';
    ctx.lineWidth = strokeWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    // Calculate scaling to fit canvas dimensions
    const scaleX = width / canvasWidth;
    const scaleY = height / canvasHeight;
    const baseScale = Math.min(scaleX, scaleY);
    const finalScale = baseScale * scale;
    
    // Center the scaled artwork
    const scaledWidth = canvasWidth * finalScale;
    const scaledHeight = canvasHeight * finalScale;
    const offsetX = (width - scaledWidth) / 2;
    const offsetY = (height - scaledHeight) / 2;
    
    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(finalScale, finalScale);
    
    // Execute canvas drawing code
    const executeFn = new Function('ctx', canvasCode);
    executeFn(ctx);
    
    ctx.restore();
    
    // Return PNG buffer
    const pngBuffer = canvas.toBuffer('image/png');
    
    return {
      data: pngBuffer,
      width,
      height,
      format: 'png'
    };
  } catch (error) {
    throw new Error(`Failed to generate PNG from canvas: ${error.message}`);
  }
}

