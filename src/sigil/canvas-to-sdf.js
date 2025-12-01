/**
 * Canvas to SDF - Direct conversion from canvas draw calls to SDF PNG
 * Simpler and more accurate than canvas → SVG → SDF pipeline
 */

import { createCanvas } from 'canvas';

/**
 * Simple distance transform for binary image
 * Creates a basic SDF from a rasterized image
 */
function distanceTransform(pixels, width, height) {
  const sdf = new Uint8Array(width * height);
  const maxDist = Math.sqrt(width * width + height * height);
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const isInside = pixels[idx * 4] > 128; // Check red channel
      
      // Find distance to nearest opposite pixel
      let minDist = maxDist;
      const searchRadius = 32; // Limit search for performance
      
      for (let dy = -searchRadius; dy <= searchRadius; dy++) {
        for (let dx = -searchRadius; dx <= searchRadius; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          
          if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
          
          const nidx = ny * width + nx;
          const nIsInside = pixels[nidx * 4] > 128;
          
          if (nIsInside !== isInside) {
            const dist = Math.sqrt(dx * dx + dy * dy);
            minDist = Math.min(minDist, dist);
          }
        }
      }
      
      // Normalize to 0-255 range
      // Inside = 128+, Outside = 128-, Edge = ~128
      const normalizedDist = Math.min(minDist / searchRadius, 1) * 127;
      sdf[idx] = isInside ? 128 + normalizedDist : 128 - normalizedDist;
    }
  }
  
  return sdf;
}

/**
 * Generate SDF PNG directly from canvas drawing code
 * @param {string} canvasCode - JavaScript code that draws on a canvas context
 * @param {Object} options - Generation options
 * @returns {Object} { data: Buffer (PNG), width: number, height: number, format: 'png' }
 */
export async function canvasToSDF(canvasCode, options = {}) {
  const {
    width = 512,
    height = 512,
    canvasWidth = 100,
    canvasHeight = 100,
    strokeWidth = 2,
    scale = 1.0  // Scale factor for the artwork (0.75 = 75% size, centered)
  } = options;
  
  if (!canvasCode || !canvasCode.trim()) {
    throw new Error('Canvas code is required');
  }
  
  try {
    // Create canvas and render the drawing code
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    
    // Clear canvas
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, width, height);
    
    // Set up drawing context
    ctx.fillStyle = 'white';
    ctx.strokeStyle = 'white';
    ctx.lineWidth = strokeWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    // Scale to fit canvas dimensions to output dimensions
    const scaleX = width / canvasWidth;
    const scaleY = height / canvasHeight;
    const baseScale = Math.min(scaleX, scaleY);
    
    // Apply the user-specified scale factor
    const finalScale = baseScale * scale;
    
    // Calculate centering offset when scaled down
    const scaledWidth = canvasWidth * finalScale;
    const scaledHeight = canvasHeight * finalScale;
    const offsetX = (width - scaledWidth) / 2;
    const offsetY = (height - scaledHeight) / 2;
    
    ctx.save();
    ctx.translate(offsetX, offsetY);  // Center the scaled artwork
    ctx.scale(finalScale, finalScale);
    
    // Execute the canvas drawing code
    const executeFn = new Function('ctx', canvasCode);
    executeFn(ctx);
    
    ctx.restore();
    
    // Get rasterized pixels
    const imageData = ctx.getImageData(0, 0, width, height);
    const pixels = imageData.data;
    
    // Generate distance field
    const sdfData = distanceTransform(pixels, width, height);
    
    // Create a new canvas for the SDF
    const sdfCanvas = createCanvas(width, height);
    const sdfCtx = sdfCanvas.getContext('2d');
    const sdfImageData = sdfCtx.createImageData(width, height);
    
    // Convert SDF data to RGBA (grayscale)
    for (let i = 0; i < sdfData.length; i++) {
      const value = sdfData[i];
      sdfImageData.data[i * 4 + 0] = value; // R
      sdfImageData.data[i * 4 + 1] = value; // G
      sdfImageData.data[i * 4 + 2] = value; // B
      sdfImageData.data[i * 4 + 3] = 255;   // A (fully opaque)
    }
    
    sdfCtx.putImageData(sdfImageData, 0, 0);
    
    // Return PNG buffer and metadata
    const pngBuffer = sdfCanvas.toBuffer('image/png');
    
    return {
      data: pngBuffer,  // PNG buffer
      width,
      height,
      format: 'png'
    };
  } catch (error) {
    throw new Error(`Failed to generate SDF from canvas: ${error.message}`);
  }
}

