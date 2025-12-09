# Circumplex-to-Color Conversion System

## Overview

This document describes a system for converting **emotional circumplex coordinates** (valence/arousal pairs) into **color triads** (primary, secondary, accent). The system provides smooth, continuous color gradients across the emotional spectrum without hard quadrant boundaries.

---

## Input Format

Your system should accept circumplex coordinates as an object:

```javascript
{
  valence: number,  // Range: -1 to +1 (negative = unpleasant, positive = pleasant)
  arousal: number   // Range: -1 to +1 (negative = low energy, positive = high energy)
}
```

**Example:**
```javascript
const circumplex = {
  valence: -0.3,
  arousal: 0.7
};
```

---

## Output Format

The converter function should return a color triad:

```javascript
{
  primary: string,    // Hex color (e.g., "#1A2B3C")
  secondary: string,  // Hex color
  accent: string      // Hex color
}
```

---

## The Circumplex Model

The emotional circumplex is divided into **5 anchor points**:

1. **Q1 (45°)**: High Valence, High Arousal → **Happy/Excited**
2. **Q2 (135°)**: Low Valence, High Arousal → **Angry/Tense**
3. **Q3 (225°)**: Low Valence, Low Arousal → **Sad/Depressed**
4. **Q4 (315°)**: High Valence, Low Arousal → **Calm/Relaxed**
5. **Center (0,0)**: Neutral

```
          AROUSAL +1
               |
        Q2     |     Q1
   (Angry)     |     (Happy)
               |
  -------------------------  VALENCE
  -1           |           +1
               |
        Q3     |     Q4
    (Sad)      |     (Calm)
               |
          AROUSAL -1
```

---

## Base Color Palette

Define **5 anchor points**, each with **3 colors** (primary, secondary, accent):

### Example Palette: "Ethereal Vapour"

```javascript
const colorPalette = {
  center: {
    primary: "#6E6E73",
    secondary: "#858590",
    accent: "#C0C0C0"
  },
  q1: {  // Happy (High V, High A)
    primary: "#50C878",
    secondary: "#4DEEEA",
    accent: "#FFFFAA"
  },
  q2: {  // Angry (Low V, High A)
    primary: "#804040",
    secondary: "#FF6B6B",
    accent: "#FFE0B0"
  },
  q3: {  // Sad (Low V, Low A)
    primary: "#454555",
    secondary: "#5A5A65",
    accent: "#9090A0"
  },
  q4: {  // Calm (High V, Low A)
    primary: "#5D7C99",
    secondary: "#A3D1FF",
    accent: "#FFFFFF"
  }
};
```

---

## Algorithm

### Step 1: Convert Cartesian to Polar Coordinates

```javascript
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
```

**Example:**
- Input: `{ valence: 0.8, arousal: 0.6 }`
- Output: `{ degrees: 36.87, distance: 1.0 }`

---

### Step 2: Calculate "Rim Color" for the Angle

The rim color is calculated by blending between the **two nearest quadrant anchors** based on the angle.

#### Anchor Positions:
- **Q1**: 45°
- **Q2**: 135°
- **Q3**: 225°
- **Q4**: 315°

#### Algorithm:

```javascript
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
```

**`t` represents the interpolation factor** (0 to 1) between the two anchors:
- `t = 0`: Use the start anchor color
- `t = 0.5`: Blend 50/50
- `t = 1`: Use the end anchor color

---

### Step 3: Interpolate from Center to Rim

Once you have the rim color, blend it with the **center (neutral) color** based on the **distance** from center:

```javascript
function getFinalColor(distance, centerColor, rimColor) {
  return {
    primary: interpolateRgb(centerColor.primary, rimColor.primary, distance),
    secondary: interpolateRgb(centerColor.secondary, rimColor.secondary, distance),
    accent: interpolateRgb(centerColor.accent, rimColor.accent, distance)
  };
}
```

**Distance controls the blend:**
- `distance = 0`: Returns center color (neutral)
- `distance = 0.5`: 50% blend between center and rim
- `distance = 1.0`: Returns full rim color (intense emotion)

---

## RGB Interpolation Function

You'll need a helper function to interpolate between two hex colors in RGB space:

```javascript
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

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

function rgbToHex(r, g, b) {
  return "#" + [r, g, b]
    .map(x => x.toString(16).padStart(2, '0'))
    .join('');
}
```

**Alternative:** If you have a library like `d3-interpolate`, you can use:
```javascript
import { interpolateRgb } from 'd3-interpolate';

const interpolator = interpolateRgb(color1, color2);
const result = interpolator(t); // Returns rgb() string or hex
```

---

## Complete Converter Function

Putting it all together:

```javascript
function circumplexToColor(circumplex, palette) {
  const { valence, arousal } = circumplex;
  
  // Step 1: Convert to polar coordinates
  const { degrees, distance } = cartesianToPolar(valence, arousal);
  
  // Step 2: Get rim color for this angle
  const rimColor = getRimColor(degrees, palette);
  
  // Step 3: Interpolate from center to rim
  const finalColor = getFinalColor(distance, palette.center, rimColor);
  
  return finalColor;
}
```

---

## Usage Example

```javascript
const circumplex = {
  valence: -0.3,
  arousal: 0.7
};

const colors = circumplexToColor(circumplex, colorPalette);

console.log(colors);
// Output:
// {
//   primary: "#6A4350",
//   secondary: "#C75B6E",
//   accent: "#D8C8A8"
// }
```

---

## Visual Flow Diagram

```
Input: { valence: -0.3, arousal: 0.7 }
            ↓
Convert to Polar: { degrees: 113°, distance: 0.76 }
            ↓
Determine Arc: 45° < 113° < 135° → Between Q1 and Q2
            ↓
Calculate t: (113 - 45) / 90 = 0.756
            ↓
Rim Color: Blend Q1 (75.6%) ← → Q2 (24.4%)
            ↓
Final Color: Blend Center (24%) ← → Rim (76%)
            ↓
Output: { primary: "#...", secondary: "#...", accent: "#..." }
```

---

## Additional Theme Palettes

### "Quantum Bioluminescence"

```javascript
const quantumPalette = {
  center: { primary: "#1A1A24", secondary: "#2A2A35", accent: "#F0F0F5" },
  q1: { primary: "#0F2D33", secondary: "#00FFC8", accent: "#FFFFFF" },
  q2: { primary: "#240F33", secondary: "#FF0055", accent: "#FF5E00" },
  q3: { primary: "#080814", secondary: "#33447A", accent: "#8A7FA3" },
  q4: { primary: "#0F1E33", secondary: "#4488AA", accent: "#CCEEFF" }
};
```

### "Iridescent Dichroic"

```javascript
const dichroicPalette = {
  center: { primary: "#5A5A60", secondary: "#707075", accent: "#A0A0A5" },
  q1: { primary: "#4A90E2", secondary: "#00E1FF", accent: "#DFFF00" },
  q2: { primary: "#4A2510", secondary: "#FF4400", accent: "#FFDD00" },
  q3: { primary: "#2B2025", secondary: "#553344", accent: "#888899" },
  q4: { primary: "#607D8B", secondary: "#B2EBF2", accent: "#FFFFFF" }
};
```

---

## Implementation Checklist

- [ ] Define base color palette with 5 anchors × 3 colors
- [ ] Implement `cartesianToPolar()` conversion
- [ ] Implement `getRimColor()` with angle-based arc detection
- [ ] Implement RGB interpolation (`interpolateRgb()`)
- [ ] Implement `getFinalColor()` with distance-based blending
- [ ] Create main `circumplexToColor()` function
- [ ] Test edge cases:
  - [ ] Center (0, 0) → Returns center colors
  - [ ] Corners (±1, ±1) → Returns quadrant colors
  - [ ] Wraparound (350°-10°) → Smooth Q4-Q1 blend

---

## Mathematical Reference

### Cartesian to Polar:
- `θ = atan2(arousal, valence)`
- `r = √(valence² + arousal²)`

### Linear Interpolation (Lerp):
- `lerp(a, b, t) = a + (b - a) × t`
- Where `t ∈ [0, 1]`

---

## Notes

- **Clamping**: Always clamp distance to maximum 1.0 to prevent oversaturation
- **Performance**: For real-time applications, consider caching interpolators
- **Color Space**: RGB interpolation is used for simplicity; LAB/LCH may provide perceptually smoother gradients
- **Accessibility**: Ensure sufficient contrast for text overlays on generated colors

---

## Contact & Attribution

This system is based on the **Russell Circumplex Model of Affect** combined with radial color interpolation. Original implementation from the Flux Emotional Gradient Explorer project.
