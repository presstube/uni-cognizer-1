// ============================================
// Circumplex Visualization Component
// ============================================

export class CircumplexViz {
  constructor(canvasId, options = {}) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) {
      throw new Error(`Canvas element "${canvasId}" not found`);
    }
    
    this.ctx = this.canvas.getContext('2d');
    
    // Options
    this.size = options.size || 400;
    this.showLabels = options.showLabels !== false;
    this.showAxes = options.showAxes !== false;
    this.showGrid = options.showGrid !== false;
    this.showDot = options.showDot !== false;
    
    // Retina support
    const dpr = window.devicePixelRatio || 1;
    this.dpr = dpr;
    
    // Set canvas size for retina (physical pixels)
    this.canvas.width = this.size * dpr;
    this.canvas.height = this.size * dpr;
    
    // Set display size (CSS pixels)
    this.canvas.style.width = this.size + 'px';
    this.canvas.style.height = this.size + 'px';
    
    // Scale context for retina
    this.ctx.scale(dpr, dpr);
    
    // Computed (more space for labels) - all in logical pixels
    this.center = this.size / 2;
    this.radius = this.size * 0.3;  // Smaller ratio = more label space
    
    // State
    this.currentValence = 0;
    this.currentArousal = 0;
    
    // Emotion labels (30° increments)
    this.emotions = [
      { angle: 15, label: 'Alert' },
      { angle: 45, label: 'Excited' },
      { angle: 75, label: 'Happy' },
      { angle: 105, label: 'Content' },
      { angle: 135, label: 'Relaxed' },
      { angle: 165, label: 'Calm' },
      { angle: 195, label: 'Bored' },
      { angle: 225, label: 'Depressed' },
      { angle: 255, label: 'Sad' },
      { angle: 285, label: 'Distressed' },
      { angle: 315, label: 'Angry' },
      { angle: 345, label: 'Tense' }
    ];
    
    // Generate gradient once (expensive operation)
    this.generateGradient();
    
    // Initial render
    this.render();
  }
  
  // ============================================
  // Public API
  // ============================================
  
  plot(valence, arousal) {
    this.currentValence = valence;
    this.currentArousal = arousal;
    this.render();
  }
  
  clear() {
    this.currentValence = 0;
    this.currentArousal = 0;
    this.render();
  }
  
  // ============================================
  // Rendering
  // ============================================
  
  render() {
    // Clear canvas
    this.ctx.clearRect(0, 0, this.size, this.size);
    
    // Draw layers
    if (this.showGrid) this.drawGrid();
    this.drawGradient();
    if (this.showAxes) this.drawAxes();
    if (this.showLabels) this.drawLabels();
    if (this.showDot) this.drawDot();
  }
  
  // ============================================
  // Grid
  // ============================================
  
  drawGrid() {
    this.ctx.strokeStyle = 'rgba(200, 200, 200, 0.2)';
    this.ctx.lineWidth = 1;
    
    const step = 20;
    
    // Vertical lines
    for (let x = 0; x <= this.size; x += step) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, this.size);
      this.ctx.stroke();
    }
    
    // Horizontal lines
    for (let y = 0; y <= this.size; y += step) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.size, y);
      this.ctx.stroke();
    }
  }
  
  // ============================================
  // Gradient Generation
  // ============================================
  
  generateGradient() {
    // Generate at physical pixel dimensions for retina
    const physicalSize = this.size * this.dpr;
    const physicalCenter = physicalSize / 2;
    const physicalRadius = this.radius * this.dpr;
    
    // Create off-screen canvas at retina resolution
    const offscreen = document.createElement('canvas');
    offscreen.width = physicalSize;
    offscreen.height = physicalSize;
    const offCtx = offscreen.getContext('2d');
    
    // Create ImageData for pixel manipulation
    const imageData = offCtx.createImageData(physicalSize, physicalSize);
    const data = imageData.data;
    
    for (let y = 0; y < physicalSize; y++) {
      for (let x = 0; x < physicalSize; x++) {
        const dx = x - physicalCenter;
        const dy = y - physicalCenter;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        // Only color inside circle
        if (dist <= physicalRadius) {
          // Calculate angle (in degrees, 0° = right, 90° = up)
          let angle = Math.atan2(-dy, dx) * (180 / Math.PI);
          if (angle < 0) angle += 360;
          
          // Normalize distance (0 = center, 1 = edge)
          const amplitude = dist / physicalRadius;
          
          // Get color at this angle/amplitude
          const color = this.getColorAt(angle, amplitude);
          
          // Set pixel with alpha based on amplitude
          const idx = (y * physicalSize + x) * 4;
          data[idx] = color.r;
          data[idx + 1] = color.g;
          data[idx + 2] = color.b;
          data[idx + 3] = color.a;  // Use alpha from color
        }
      }
    }
    
    // Put imageData on offscreen canvas
    offCtx.putImageData(imageData, 0, 0);
    
    // Store the offscreen canvas (not ImageData)
    this.gradientCanvas = offscreen;
  }
  
  drawGradient() {
    // Draw the pre-rendered gradient at logical size
    this.ctx.drawImage(this.gradientCanvas, 0, 0, this.size, this.size);
  }
  
  // ============================================
  // Color Interpolation
  // ============================================
  
  getColorAt(angleDeg, amplitude) {
    // Pure colors at 45° multiples (at 50% saturation max)
    const pureColors = {
      45: [0, 255, 0],      // Green (Excited)
      135: [255, 255, 0],   // Yellow (Relaxed)
      225: [255, 0, 0],     // Red (Depressed)
      315: [0, 0, 255]      // Blue (Angry)
    };
    
    const keys = [45, 135, 225, 315];
    
    // Find adjacent pure colors
    let lowerKey, upperKey;
    
    if (angleDeg <= 45) {
      lowerKey = 315;
      upperKey = 45;
      angleDeg = angleDeg + 360;  // Wrap for interpolation
    } else if (angleDeg <= 135) {
      lowerKey = 45;
      upperKey = 135;
    } else if (angleDeg <= 225) {
      lowerKey = 135;
      upperKey = 225;
    } else if (angleDeg <= 315) {
      lowerKey = 225;
      upperKey = 315;
    } else {
      lowerKey = 315;
      upperKey = 45;
      angleDeg = angleDeg;  // Will wrap in calculation
    }
    
    // Interpolation factor between lower and upper
    const lowerAngle = lowerKey === 315 && upperKey === 45 ? 315 : lowerKey;
    const upperAngle = lowerKey === 315 && upperKey === 45 ? 405 : upperKey;
    
    const range = upperAngle - lowerAngle;
    const t = (angleDeg - lowerAngle) / range;
    
    // Get RGB values
    const lowerColor = pureColors[lowerKey];
    const upperColor = pureColors[upperKey];
    
    // Interpolate between adjacent pure colors
    const r = this.lerp(lowerColor[0], upperColor[0], t);
    const g = this.lerp(lowerColor[1], upperColor[1], t);
    const b = this.lerp(lowerColor[2], upperColor[2], t);
    
    // Max saturation is 0.5 (not 1.0) for mellower colors
    // Scale amplitude to only reach 0.5 at the edge
    const maxSaturation = 0.5;
    const scaledAmplitude = amplitude * maxSaturation;
    
    // Alpha based on scaled amplitude (center = transparent, edge = 50% opaque)
    const alpha = Math.round(scaledAmplitude * 255);
    
    return { 
      r: Math.round(r), 
      g: Math.round(g), 
      b: Math.round(b),
      a: alpha
    };
  }
  
  lerp(a, b, t) {
    return a + (b - a) * t;
  }
  
  // ============================================
  // Axes
  // ============================================
  
  drawAxes() {
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    this.ctx.lineWidth = 2;
    
    // Horizontal axis (Valence)
    this.ctx.beginPath();
    this.ctx.moveTo(this.center - this.radius - 10, this.center);
    this.ctx.lineTo(this.center + this.radius + 10, this.center);
    this.ctx.stroke();
    
    // Vertical axis (Arousal)
    this.ctx.beginPath();
    this.ctx.moveTo(this.center, this.center - this.radius - 10);
    this.ctx.lineTo(this.center, this.center + this.radius + 10);
    this.ctx.stroke();
    
    // Axis labels
    this.ctx.font = '11px sans-serif';
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    
    // Valence labels (left/right) - pushed out further
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('Valence (−)', this.center - this.radius - 60, this.center);
    this.ctx.fillText('Valence (+)', this.center + this.radius + 60, this.center);
    
    // Arousal labels (top/bottom) - pushed out further
    this.ctx.fillText('Arousal (+)', this.center, this.center - this.radius - 45);
    this.ctx.fillText('Arousal (−)', this.center, this.center + this.radius + 45);
  }
  
  // ============================================
  // Emotion Labels
  // ============================================
  
  drawLabels() {
    this.ctx.font = '11px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillStyle = '#fff';
    
    this.emotions.forEach(emotion => {
      // Convert angle to radians (subtract 90 because canvas 0° is right, we want 0° up)
      const rad = (emotion.angle - 90) * Math.PI / 180;
      
      // Position outside gradient circle
      const labelRadius = this.radius * 1.25;
      const x = this.center + Math.cos(rad) * labelRadius;
      const y = this.center + Math.sin(rad) * labelRadius;
      
      this.ctx.fillText(emotion.label, x, y);
    });
  }
  
  // ============================================
  // Position Dot
  // ============================================
  
  drawDot() {
    let v = this.currentValence;
    let a = this.currentArousal;
    
    // Normalize to unit circle if needed (corner case handling)
    let amplitude = Math.sqrt(v * v + a * a);
    
    if (amplitude > 1) {
      v /= amplitude;
      a /= amplitude;
    }
    
    // Convert to canvas coordinates
    // Note: Canvas Y is inverted (down is positive)
    const x = this.center + v * this.radius;
    const y = this.center - a * this.radius;
    
    // Draw line from center to dot
    this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([4, 4]);
    this.ctx.beginPath();
    this.ctx.moveTo(this.center, this.center);
    this.ctx.lineTo(x, y);
    this.ctx.stroke();
    this.ctx.setLineDash([]);
    
    // Draw dot
    this.ctx.fillStyle = '#000';
    this.ctx.beginPath();
    this.ctx.arc(x, y, 7, 0, Math.PI * 2);
    this.ctx.fill();
    
    // White border for visibility
    this.ctx.strokeStyle = '#fff';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();
  }
}
