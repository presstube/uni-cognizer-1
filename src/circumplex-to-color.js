/**
 * Circumplex to Color Triad Converter
 * 
 * Pure function module to convert emotional circumplex coordinates
 * (valence/arousal) into color triads (primary, secondary, accent).
 * 
 * Based on the Russell Circumplex Model of Affect with radial 
 * color interpolation across 5 anchor points.
 */

// ============================================
// Color Palette Definition
// ============================================

export const ETHEREAL_VAPOUR_PALETTE = {
  center: {
    primary: "#6E6E73",
    secondary: "#858590",
    accent: "#C0C0C0"
  },
  q1: {  // Happy (High Valence, High Arousal)
    primary: "#50C878",
    secondary: "#4DEEEA",
    accent: "#FFFFAA"
  },
  q2: {  // Angry (Low Valence, High Arousal)
    primary: "#804040",
    secondary: "#FF6B6B",
    accent: "#FFE0B0"
  },
  q3: {  // Sad (Low Valence, Low Arousal)
    primary: "#454555",
    secondary: "#5A5A65",
    accent: "#9090A0"
  },
  q4: {  // Calm (High Valence, Low Arousal)
    primary: "#5D7C99",
    secondary: "#A3D1FF",
    accent: "#FFFFFF"
  }
};

// ============================================
// Main Conversion Function
// ============================================

/**
 * Convert circumplex coordinates to color triad
 * @param {Object} circumplex - { valence: -1 to 1, arousal: -1 to 1 }
 * @param {Object} palette - Color palette with center and q1-q4 anchors
 * @returns {Object} { primary: "#...", secondary: "#...", accent: "#..." }
 */
export function circumplexToColor(circumplex, palette = ETHEREAL_VAPOUR_PALETTE) {
  const { valence = 0, arousal = 0 } = circumplex;
  
  // Step 1: Convert Cartesian to Polar coordinates
  const { degrees, distance } = cartesianToPolar(valence, arousal);
  
  // Step 2: Get rim color for this angle
  const rimColor = getRimColor(degrees, palette);
  
  // Step 3: Interpolate from center to rim based on distance
  const finalColor = getFinalColor(distance, palette.center, rimColor);
  
  return finalColor;
}

// ============================================
// Helper Functions
// ============================================

/**
 * Convert Cartesian (valence, arousal) to Polar (degrees, distance)
 */
function cartesianToPolar(valence, arousal) {
  // Calculate angle in radians, then convert to degrees
  const radians = Math.atan2(arousal, valence);
  let degrees = radians * (180 / Math.PI);
  
  // Normalize to 0-360 range
  if (degrees < 0) {
    degrees += 360;
  }
  
  // Calculate distance from center (clamped to max 1.0)
  const distance = Math.min(Math.sqrt(valence * valence + arousal * arousal), 1.0);
  
  return { degrees, distance };
}

/**
 * Calculate rim color by blending between nearest quadrant anchors
 */
function getRimColor(degrees, palette) {
  let startAnchor, endAnchor, t;
  
  // Determine which arc the angle falls in
  if (degrees >= 45 && degrees < 135) {
    // Between Q1 and Q2
    startAnchor = palette.q1;
    endAnchor = palette.q2;
    t = (degrees - 45) / 90;
    
  } else if (degrees >= 135 && degrees < 225) {
    // Between Q2 and Q3
    startAnchor = palette.q2;
    endAnchor = palette.q3;
    t = (degrees - 135) / 90;
    
  } else if (degrees >= 225 && degrees < 315) {
    // Between Q3 and Q4
    startAnchor = palette.q3;
    endAnchor = palette.q4;
    t = (degrees - 225) / 90;
    
  } else {
    // Between Q4 and Q1 (wrapping around 360°/0°)
    startAnchor = palette.q4;
    endAnchor = palette.q1;
    
    if (degrees >= 315) {
      t = (degrees - 315) / 90;
    } else {
      t = (degrees + 45) / 90;
    }
  }
  
  // Interpolate RGB between the two anchors
  return {
    primary: interpolateRgb(startAnchor.primary, endAnchor.primary, t),
    secondary: interpolateRgb(startAnchor.secondary, endAnchor.secondary, t),
    accent: interpolateRgb(startAnchor.accent, endAnchor.accent, t)
  };
}

/**
 * Interpolate from center to rim based on distance
 */
function getFinalColor(distance, centerColor, rimColor) {
  return {
    primary: interpolateRgb(centerColor.primary, rimColor.primary, distance),
    secondary: interpolateRgb(centerColor.secondary, rimColor.secondary, distance),
    accent: interpolateRgb(centerColor.accent, rimColor.accent, distance)
  };
}

/**
 * Interpolate between two hex colors in RGB space
 */
function interpolateRgb(color1, color2, t) {
  // Parse hex colors to RGB
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);
  
  // Interpolate each channel
  const r = Math.round(rgb1.r + (rgb2.r - rgb1.r) * t);
  const g = Math.round(rgb1.g + (rgb2.g - rgb1.g) * t);
  const b = Math.round(rgb1.b + (rgb2.b - rgb1.b) * t);
  
  // Convert back to hex
  return rgbToHex(r, g, b);
}

/**
 * Convert hex color to RGB object
 */
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 };
}

/**
 * Convert RGB values to hex color string
 */
function rgbToHex(r, g, b) {
  return "#" + [r, g, b]
    .map(x => Math.max(0, Math.min(255, x)).toString(16).padStart(2, '0'))
    .join('');
}
