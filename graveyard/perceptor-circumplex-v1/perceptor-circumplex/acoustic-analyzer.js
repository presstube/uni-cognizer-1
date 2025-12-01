/**
 * Acoustic Analyzer
 * Extracts acoustic features from audio for circumplex emotion mapping
 */

export class AcousticAnalyzer {
  constructor(sampleRate = 16000) {
    this.sampleRate = sampleRate;
    this.history = [];
    this.historySize = 10; // Keep 10 recent windows for envelope calculation
  }
  
  /**
   * Calculate RMS (Root Mean Square) - Volume/Energy
   * Primary indicator of arousal
   * @param {Float32Array} samples - Audio samples (-1 to 1)
   * @returns {number} - Normalized RMS (0 to 1)
   */
  calculateRMS(samples) {
    let sumSquares = 0;
    for (let i = 0; i < samples.length; i++) {
      const s = Math.max(-1, Math.min(1, samples[i]));
      sumSquares += s * s;
    }
    
    const rms = Math.sqrt(sumSquares / samples.length);
    
    // Normalize to 0-1 range (multiply by 3 for sensitivity)
    return Math.min(1.0, rms * 3.0);
  }
  
  /**
   * Calculate Zero Crossing Rate - Roughness/Noise
   * Secondary indicator of arousal (tension, roughness)
   * @param {Float32Array} samples - Audio samples
   * @returns {number} - Normalized ZCR (0 to 1)
   */
  calculateZCR(samples) {
    let crossings = 0;
    for (let i = 1; i < samples.length; i++) {
      if ((samples[i] >= 0 && samples[i - 1] < 0) || 
          (samples[i] < 0 && samples[i - 1] >= 0)) {
        crossings++;
      }
    }
    
    // Normalize by sample length
    const zcr = crossings / samples.length;
    
    // Typical ZCR range is 0-0.5, so normalize to 0-1
    return Math.min(1.0, zcr * 2.0);
  }
  
  /**
   * Calculate Spectral Centroid - Brightness/Sharpness
   * Refines arousal (brighter = more activated)
   * @param {Float32Array} samples - Audio samples
   * @returns {number} - Centroid in Hz
   */
  calculateSpectralCentroid(samples) {
    // Simple approximation using high-frequency energy
    // Real implementation would use FFT, but this is faster
    
    // Calculate energy in high-frequency changes (approximation)
    let highFreqEnergy = 0;
    let totalEnergy = 0;
    
    for (let i = 1; i < samples.length; i++) {
      const diff = Math.abs(samples[i] - samples[i - 1]);
      highFreqEnergy += diff * i; // Weight by position
      totalEnergy += diff;
    }
    
    if (totalEnergy === 0) return 1000; // Default to low centroid
    
    // Approximate centroid based on weighted energy
    // Map to typical range: 500Hz (low) to 4000Hz (high)
    const normalized = highFreqEnergy / (totalEnergy * samples.length);
    const centroid = 500 + (normalized * 3500);
    
    return Math.round(centroid);
  }
  
  /**
   * Calculate Temporal Envelope - Dynamics over time
   * Describes how energy changes
   * @param {number} currentRMS - Current window RMS
   * @returns {string} - "rising" | "falling" | "steady" | "varying"
   */
  calculateTemporalEnvelope(currentRMS) {
    this.history.push(currentRMS);
    
    // Keep only recent history
    if (this.history.length > this.historySize) {
      this.history.shift();
    }
    
    // Need at least 3 windows to determine envelope
    if (this.history.length < 3) {
      return 'steady';
    }
    
    // Calculate trend
    const recent = this.history.slice(-3);
    const oldest = recent[0];
    const newest = recent[recent.length - 1];
    const change = newest - oldest;
    
    // Calculate variance to detect "varying"
    const mean = recent.reduce((a, b) => a + b) / recent.length;
    const variance = recent.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / recent.length;
    
    // High variance = varying
    if (variance > 0.05) {
      return 'varying';
    }
    
    // Directional trend
    if (change > 0.1) {
      return 'rising';
    } else if (change < -0.1) {
      return 'falling';
    } else {
      return 'steady';
    }
  }
  
  /**
   * Analyze a buffer of audio samples
   * @param {Float32Array} samples - Audio buffer
   * @returns {Object} - Acoustic features
   */
  analyze(samples) {
    const rms = this.calculateRMS(samples);
    const zcr = this.calculateZCR(samples);
    const centroid = this.calculateSpectralCentroid(samples);
    const envelope = this.calculateTemporalEnvelope(rms);
    
    return {
      rms: parseFloat(rms.toFixed(3)),
      zcr: parseFloat(zcr.toFixed(3)),
      centroid,
      envelope,
      timestamp: Date.now()
    };
  }
  
  /**
   * Format features as text for sending to Gemini
   * @param {Object} features - Acoustic features
   * @returns {string} - Formatted text
   */
  static formatForPrompt(features) {
    return `[Acoustic: RMS=${features.rms.toFixed(2)} ZCR=${features.zcr.toFixed(2)} Centroid=${features.centroid}Hz Envelope=${features.envelope}]`;
  }
}

/**
 * Average multiple feature objects
 * @param {Array} featuresArray - Array of feature objects
 * @returns {Object} - Averaged features
 */
export function averageAcousticFeatures(featuresArray) {
  if (featuresArray.length === 0) {
    return {
      rms: 0,
      zcr: 0,
      centroid: 1000,
      envelope: 'steady'
    };
  }
  
  const sum = featuresArray.reduce((acc, f) => ({
    rms: acc.rms + f.rms,
    zcr: acc.zcr + f.zcr,
    centroid: acc.centroid + f.centroid
  }), { rms: 0, zcr: 0, centroid: 0 });
  
  // Most common envelope
  const envelopes = featuresArray.map(f => f.envelope);
  const envelopeCounts = {};
  envelopes.forEach(e => envelopeCounts[e] = (envelopeCounts[e] || 0) + 1);
  const mostCommonEnvelope = Object.keys(envelopeCounts)
    .reduce((a, b) => envelopeCounts[a] > envelopeCounts[b] ? a : b);
  
  return {
    rms: parseFloat((sum.rms / featuresArray.length).toFixed(3)),
    zcr: parseFloat((sum.zcr / featuresArray.length).toFixed(3)),
    centroid: Math.round(sum.centroid / featuresArray.length),
    envelope: mostCommonEnvelope
  };
}
