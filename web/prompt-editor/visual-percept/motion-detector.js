/**
 * Motion Detection via Frame Differencing
 * Detects motion between video frames using pixel comparison
 */

export class MotionDetector {
  constructor(videoElement, options = {}) {
    this.video = videoElement;
    this.threshold = options.threshold || 25;
    
    // Offscreen canvas for comparison
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
    
    this.previousFrame = null;
    this.motionScore = 0;
    this.maxScore = options.maxScore || 50000; // For normalization
  }
  
  // Detect motion and return raw score
  detect() {
    if (!this.video.videoWidth || this.video.readyState < 2) return 0;
    
    const width = this.video.videoWidth;
    const height = this.video.videoHeight;
    
    // Initialize canvas
    if (this.canvas.width !== width) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
    
    // Capture current frame
    this.ctx.drawImage(this.video, 0, 0, width, height);
    const currentFrame = this.ctx.getImageData(0, 0, width, height);
    
    // First frame - no comparison
    if (!this.previousFrame) {
      this.previousFrame = currentFrame;
      return 0;
    }
    
    // Calculate pixel differences
    let diffSum = 0;
    const current = currentFrame.data;
    const previous = this.previousFrame.data;
    
    // Sample every pixel (i += 4 because RGBA = 4 bytes per pixel)
    for (let i = 0; i < current.length; i += 4) {
      const rDiff = Math.abs(current[i] - previous[i]);
      const gDiff = Math.abs(current[i + 1] - previous[i + 1]);
      const bDiff = Math.abs(current[i + 2] - previous[i + 2]);
      
      const pixelDiff = (rDiff + gDiff + bDiff) / 3;
      
      if (pixelDiff > this.threshold) {
        diffSum += pixelDiff;
      }
    }
    
    // Update state
    this.previousFrame = currentFrame;
    this.motionScore = diffSum;
    
    return diffSum;
  }
  
  // Get normalized motion (0-100)
  getNormalized() {
    return Math.min(100, Math.round((this.motionScore / this.maxScore) * 100));
  }
  
  // Update sensitivity (maxScore)
  setSensitivity(maxScore) {
    this.maxScore = maxScore;
  }
  
  // Get raw score
  getScore() {
    return this.motionScore;
  }
}

