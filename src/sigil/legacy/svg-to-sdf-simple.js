/**
 * SVG to SDF - Server-side simplified implementation
 * Using manual SDF generation instead of problematic library
 * 
 * This is a simple distance field generator that doesn't require browser APIs
 */

import { createCanvas } from 'canvas';

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
 * Simple distance transform for binary image
 * Creates a basic SDF from a rasterized path
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
 * Parse and draw SVG path commands using canvas methods
 * Supports: M, L, C, Q, Z commands
 */
function drawSVGPath(ctx, pathData) {
  // Simple SVG path parser
  const commands = pathData.match(/[MLCQZA][^MLCQZA]*/gi);
  
  if (!commands) return;
  
  let currentX = 0;
  let currentY = 0;
  
  ctx.beginPath();
  
  for (const cmd of commands) {
    const type = cmd[0].toUpperCase();
    const coords = cmd.slice(1).trim().split(/[\s,]+/).map(Number).filter(n => !isNaN(n));
    
    switch (type) {
      case 'M': // MoveTo
        if (coords.length >= 2) {
          currentX = coords[0];
          currentY = coords[1];
          ctx.moveTo(currentX, currentY);
        }
        break;
        
      case 'L': // LineTo
        if (coords.length >= 2) {
          currentX = coords[0];
          currentY = coords[1];
          ctx.lineTo(currentX, currentY);
        }
        break;
        
      case 'C': // Cubic Bezier
        if (coords.length >= 6) {
          currentX = coords[4];
          currentY = coords[5];
          ctx.bezierCurveTo(coords[0], coords[1], coords[2], coords[3], coords[4], coords[5]);
        }
        break;
        
      case 'Q': // Quadratic Bezier
        if (coords.length >= 4) {
          currentX = coords[2];
          currentY = coords[3];
          ctx.quadraticCurveTo(coords[0], coords[1], coords[2], coords[3]);
        }
        break;
        
      case 'A': // Arc - convert SVG arc to canvas arc
        if (coords.length >= 7) {
          const rx = coords[0];
          const ry = coords[1];
          // coords[2] is rotation (not used in simple case)
          // coords[3] is largeArcFlag
          // coords[4] is sweepFlag
          const x = coords[5];
          const y = coords[6];
          
          // For circles (rx === ry), we can use canvas arc
          if (Math.abs(rx - ry) < 0.01) {
            // Calculate center point from current position and end point
            // This is a simplified calculation for circular arcs
            const dx = x - currentX;
            const dy = y - currentY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist > 0.01) {
              // Midpoint
              const mx = (currentX + x) / 2;
              const my = (currentY + y) / 2;
              
              // Distance from midpoint to center
              const h = Math.sqrt(Math.max(0, rx * rx - (dist / 2) * (dist / 2)));
              
              // Perpendicular direction
              const perpX = -dy / dist;
              const perpY = dx / dist;
              
              // Center point (try both directions based on sweep flag)
              const sweepFlag = coords[4];
              const largeArcFlag = coords[3];
              const sign = (sweepFlag === largeArcFlag) ? 1 : -1;
              
              const cx = mx + sign * h * perpX;
              const cy = my + sign * h * perpY;
              
              // Calculate angles
              const startAngle = Math.atan2(currentY - cy, currentX - cx);
              const endAngle = Math.atan2(y - cy, x - cx);
              
              // Draw the arc
              ctx.arc(cx, cy, rx, startAngle, endAngle, sweepFlag === 0);
            }
          } else {
            // For ellipses, just draw a line (complex to implement properly)
            ctx.lineTo(x, y);
          }
          
          currentX = x;
          currentY = y;
        }
        break;
        
      case 'Z': // Close path
        ctx.closePath();
        break;
    }
  }
}

/**
 * Generate SDF from SVG using canvas rasterization + distance transform
 * Returns PNG buffer that can be saved as an image file
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
    // Create canvas and render SVG path
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
    
    // Scale to fit viewBox
    const [vx, vy, vw, vh] = viewBox;
    const scaleX = width / vw;
    const scaleY = height / vh;
    const scale = Math.min(scaleX, scaleY);
    
    ctx.save();
    ctx.translate(-vx * scale, -vy * scale);
    ctx.scale(scale, scale);
    
    // Extract and render path
    const pathData = extractPathFromSVG(svgString);
    drawSVGPath(ctx, pathData);
    
    if (strokeWidth > 0) {
      ctx.stroke();
    } else {
      ctx.fill();
    }
    
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
      data: pngBuffer,  // PNG buffer instead of raw Uint8Array
      width,
      height,
      format: 'png'
    };
  } catch (error) {
    throw new Error(`Failed to generate SDF from SVG: ${error.message}`);
  }
}

