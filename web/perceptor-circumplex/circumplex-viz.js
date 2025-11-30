/**
 * Circumplex Visualizer
 * 2D emotion visualization (valence × arousal)
 */

export class CircumplexVisualizer {
  constructor(canvasId, options = {}) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    
    // Options
    this.size = options.size || 400;
    this.maxHistory = options.maxHistory || 50;
    
    // Set canvas size
    this.canvas.width = this.size;
    this.canvas.height = this.size;
    
    // State
    this.history = [];
    this.currentPoint = null;
    
    // Initialize
    this.draw();
  }
  
  /**
   * Map coordinate from -1 to 1 range to canvas pixels
   */
  mapToCanvas(value) {
    return ((value + 1) / 2) * this.size;
  }
  
  /**
   * Draw the entire visualization
   */
  draw() {
    const ctx = this.ctx;
    const size = this.size;
    const center = size / 2;
    
    // Clear canvas
    ctx.clearRect(0, 0, size, size);
    
    // Draw quadrants with color gradients
    this.drawQuadrants();
    
    // Draw axes
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    // Horizontal (valence)
    ctx.moveTo(0, center);
    ctx.lineTo(size, center);
    // Vertical (arousal)
    ctx.moveTo(center, 0);
    ctx.lineTo(center, size);
    ctx.stroke();
    
    // Draw axis labels
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = '11px monospace';
    ctx.textAlign = 'center';
    
    // Valence labels
    ctx.fillText('Negative', center * 0.5, center - 10);
    ctx.fillText('Positive', center * 1.5, center - 10);
    
    // Arousal labels
    ctx.save();
    ctx.translate(center - 10, center * 0.5);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('High', 0, 0);
    ctx.restore();
    
    ctx.save();
    ctx.translate(center - 10, center * 1.5);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Low', 0, 0);
    ctx.restore();
    
    // Draw quadrant labels (emotion regions)
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    
    // Top-right: Excited (high arousal, positive valence)
    ctx.fillStyle = 'rgba(255, 200, 0, 0.6)';
    ctx.fillText('EXCITED', center * 1.5, center * 0.5);
    
    // Top-left: Anxious (high arousal, negative valence)
    ctx.fillStyle = 'rgba(255, 100, 100, 0.6)';
    ctx.fillText('ANXIOUS', center * 0.5, center * 0.5);
    
    // Bottom-left: Sad (low arousal, negative valence)
    ctx.fillStyle = 'rgba(100, 150, 255, 0.6)';
    ctx.fillText('SAD', center * 0.5, center * 1.5);
    
    // Bottom-right: Content (low arousal, positive valence)
    ctx.fillStyle = 'rgba(100, 255, 150, 0.6)';
    ctx.fillText('CONTENT', center * 1.5, center * 1.5);
    
    // Draw history trail
    this.drawTrail();
    
    // Draw current point
    if (this.currentPoint) {
      const x = this.mapToCanvas(this.currentPoint.valence);
      const y = this.mapToCanvas(-this.currentPoint.arousal); // Invert Y for canvas
      
      // Outer glow
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.beginPath();
      ctx.arc(x, y, 12, 0, Math.PI * 2);
      ctx.fill();
      
      // Main point
      ctx.fillStyle = 'rgba(255, 255, 255, 1.0)';
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fill();
      
      // Inner highlight
      ctx.fillStyle = 'rgba(0, 200, 255, 1.0)';
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  
  /**
   * Draw quadrant background colors
   */
  drawQuadrants() {
    const ctx = this.ctx;
    const size = this.size;
    const center = size / 2;
    
    // Top-right: Excited (yellow/orange)
    const gradTR = ctx.createRadialGradient(center * 1.5, center * 0.5, 0, center * 1.5, center * 0.5, center);
    gradTR.addColorStop(0, 'rgba(255, 200, 0, 0.15)');
    gradTR.addColorStop(1, 'rgba(255, 200, 0, 0)');
    ctx.fillStyle = gradTR;
    ctx.fillRect(center, 0, center, center);
    
    // Top-left: Anxious (red)
    const gradTL = ctx.createRadialGradient(center * 0.5, center * 0.5, 0, center * 0.5, center * 0.5, center);
    gradTL.addColorStop(0, 'rgba(255, 100, 100, 0.15)');
    gradTL.addColorStop(1, 'rgba(255, 100, 100, 0)');
    ctx.fillStyle = gradTL;
    ctx.fillRect(0, 0, center, center);
    
    // Bottom-left: Sad (blue)
    const gradBL = ctx.createRadialGradient(center * 0.5, center * 1.5, 0, center * 0.5, center * 1.5, center);
    gradBL.addColorStop(0, 'rgba(100, 150, 255, 0.15)');
    gradBL.addColorStop(1, 'rgba(100, 150, 255, 0)');
    ctx.fillStyle = gradBL;
    ctx.fillRect(0, center, center, center);
    
    // Bottom-right: Content (green)
    const gradBR = ctx.createRadialGradient(center * 1.5, center * 1.5, 0, center * 1.5, center * 1.5, center);
    gradBR.addColorStop(0, 'rgba(100, 255, 150, 0.15)');
    gradBR.addColorStop(1, 'rgba(100, 255, 150, 0)');
    ctx.fillStyle = gradBR;
    ctx.fillRect(center, center, center, center);
  }
  
  /**
   * Draw history trail
   */
  drawTrail() {
    if (this.history.length < 2) return;
    
    const ctx = this.ctx;
    
    ctx.strokeStyle = 'rgba(0, 200, 255, 0.5)';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    ctx.beginPath();
    
    for (let i = 0; i < this.history.length; i++) {
      const point = this.history[i];
      const x = this.mapToCanvas(point.valence);
      const y = this.mapToCanvas(-point.arousal); // Invert Y
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
      
      // Draw fading dots along trail
      const alpha = (i + 1) / this.history.length * 0.5;
      ctx.fillStyle = `rgba(0, 200, 255, ${alpha})`;
      ctx.fillRect(x - 1, y - 1, 2, 2);
    }
    
    ctx.stroke();
  }
  
  /**
   * Update visualization with new emotion coordinates
   * @param {number} valence - Valence (-1 to 1)
   * @param {number} arousal - Arousal (-1 to 1)
   */
  plot(valence, arousal) {
    // Clamp values
    valence = Math.max(-1, Math.min(1, valence));
    arousal = Math.max(-1, Math.min(1, arousal));
    
    // Update current point
    this.currentPoint = { valence, arousal };
    
    // Add to history
    this.history.push({ valence, arousal });
    
    // Trim history
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }
    
    // Redraw
    this.draw();
  }
  
  /**
   * Clear history and current point
   */
  clear() {
    this.history = [];
    this.currentPoint = null;
    this.draw();
  }
}
