/**
 * Canvas to SVG Converter
 * Converts Canvas 2D drawing commands to SVG path data
 * 
 * Supports: moveTo, lineTo, arc, quadraticCurveTo, bezierCurveTo, closePath
 */

/**
 * Convert Canvas arc to SVG arc path command
 * Canvas: arc(cx, cy, radius, startAngle, endAngle)
 * SVG: A rx ry x-axis-rotation large-arc-flag sweep-flag x y
 */
function arcToSVGPath(cx, cy, radius, startAngle, endAngle) {
  // Calculate start and end points on the circle
  const x1 = cx + radius * Math.cos(startAngle);
  const y1 = cy + radius * Math.sin(startAngle);
  const x2 = cx + radius * Math.cos(endAngle);
  const y2 = cy + radius * Math.sin(endAngle);
  
  // Calculate angle difference (handle negative angles)
  let angleDiff = endAngle - startAngle;
  if (angleDiff < 0) {
    angleDiff += Math.PI * 2;
  }
  
  // Determine if this is a large arc (> 180 degrees)
  const largeArc = angleDiff > Math.PI ? 1 : 0;
  
  // Sweep flag: 1 for clockwise (positive angle), 0 for counter-clockwise
  const sweep = 1;
  
  // Special case: full circle (draw as two arcs)
  if (Math.abs(angleDiff - Math.PI * 2) < 0.001) {
    const midX = cx + radius * Math.cos(startAngle + Math.PI);
    const midY = cy + radius * Math.sin(startAngle + Math.PI);
    return `M ${x1} ${y1} A ${radius} ${radius} 0 1 1 ${midX} ${midY} A ${radius} ${radius} 0 1 1 ${x1} ${y1}`;
  }
  
  return `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} ${sweep} ${x2} ${y2}`;
}

/**
 * Convert Canvas drawing commands to SVG
 * @param {string} canvasCode - JavaScript code containing ctx drawing commands
 * @param {number} width - Canvas width (default: 100)
 * @param {number} height - Canvas height (default: 100)
 * @returns {string} SVG XML string
 */
export function canvasToSVG(canvasCode, width = 100, height = 100) {
  const paths = [];
  let currentPath = '';
  let firstMove = null;
  
  // Create a mock context that records path data
  const mockCtx = {
    beginPath() {
      currentPath = '';
      firstMove = null;
    },
    
    moveTo(x, y) {
      currentPath += `M ${x} ${y} `;
      if (!firstMove) {
        firstMove = { x, y };
      }
    },
    
    lineTo(x, y) {
      currentPath += `L ${x} ${y} `;
    },
    
    arc(x, y, radius, startAngle, endAngle) {
      const arcPath = arcToSVGPath(x, y, radius, startAngle, endAngle);
      currentPath += arcPath + ' ';
    },
    
    quadraticCurveTo(cpx, cpy, x, y) {
      currentPath += `Q ${cpx} ${cpy} ${x} ${y} `;
    },
    
    bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y) {
      currentPath += `C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${x} ${y} `;
    },
    
    closePath() {
      currentPath += 'Z ';
    },
    
    stroke() {
      if (currentPath.trim()) {
        paths.push(currentPath.trim());
        currentPath = '';
      }
    },
    
    fill() {
      if (currentPath.trim()) {
        paths.push(currentPath.trim());
        currentPath = '';
      }
    }
  };
  
  try {
    // Execute the canvas code against mock context
    const executeFn = new Function('ctx', canvasCode);
    executeFn(mockCtx);
    
    // Capture any remaining path not explicitly stroked/filled
    if (currentPath.trim()) {
      paths.push(currentPath.trim());
    }
  } catch (error) {
    throw new Error(`Failed to execute canvas code: ${error.message}`);
  }
  
  if (paths.length === 0) {
    throw new Error('No paths generated from canvas code');
  }
  
  // Build SVG
  const pathElements = paths.map(pathData => 
    `  <path d="${pathData}" fill="none" stroke="black" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"/>`
  ).join('\n');
  
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
${pathElements}
</svg>`;
}

