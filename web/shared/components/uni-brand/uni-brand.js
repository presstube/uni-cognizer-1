/**
 * UniBrand Component
 * Renders the UNI sigil (40x40px) with "UNI" text
 * Used as branding element in dashboard status bar
 */

import { Sigil } from '../../sigil.standalone.js';

// UNI sigil draw calls (inlined from uni-sigil.json)
const UNI_SIGIL_DRAW_CALLS = `ctx.beginPath();\nctx.arc(50, 50, 35, 0, Math.PI * 2);\nctx.stroke();\n\nctx.beginPath();\nctx.arc(50, 50, 28, 0, Math.PI * 2);\nctx.stroke();\n\nctx.beginPath();\nctx.moveTo(50, 22);\nctx.lineTo(50, 35);\nctx.stroke();\n\nctx.beginPath();\nctx.moveTo(50, 65);\nctx.lineTo(50, 78);\nctx.stroke();\n\nctx.beginPath();\nctx.moveTo(22, 50);\nctx.lineTo(35, 50);\nctx.stroke();\n\nctx.beginPath();\nctx.moveTo(65, 50);\nctx.lineTo(78, 50);\nctx.stroke();\n\nctx.beginPath();\nctx.arc(50, 45, 3, 0, Math.PI * 2);\nctx.stroke();\n\nctx.beginPath();\nctx.moveTo(50, 48);\nctx.quadraticCurveTo(45, 53, 40, 55);\nctx.stroke();\n\nctx.beginPath();\nctx.moveTo(50, 48);\nctx.quadraticCurveTo(55, 53, 60, 55);\nctx.stroke();\n\nctx.beginPath();\nctx.moveTo(35, 32);\nctx.lineTo(42, 42);\nctx.stroke();\n\nctx.beginPath();\nctx.moveTo(65, 32);\nctx.lineTo(58, 42);\nctx.stroke();\n\nctx.beginPath();\nctx.moveTo(35, 68);\nctx.lineTo(42, 58);\nctx.stroke();\n\nctx.beginPath();\nctx.moveTo(65, 68);\nctx.lineTo(58, 58);\nctx.stroke();`;

export class UniBrand {
  /**
   * Create a new UniBrand instance
   * @param {Object} config - Configuration
   * @param {number} [config.canvasSize=80] - Canvas size in pixels
   * @param {string} [config.lineColor='#ffffff'] - Sigil line color
   * @param {number} [config.lineWeight=1.0] - Sigil line weight
   */
  constructor(config = {}) {
    const {
      canvasSize = 80,
      lineColor = '#ffffff',
      lineWeight = 1.0
    } = config;
    
    this.canvasSize = canvasSize;
    this.lineColor = lineColor;
    this.lineWeight = lineWeight;
    this.element = null;
    this.canvas = null;
    this.sigilInstance = null;
  }
  
  /**
   * Create and return the component DOM element
   * @returns {HTMLElement}
   */
  create() {
    // Container
    const container = document.createElement('div');
    container.className = 'uni-brand';
    
    // Canvas for sigil (let Sigil class handle sizing with DPR)
    const canvas = document.createElement('canvas');
    canvas.className = 'uni-brand-canvas';
    // Don't set width/height here - Sigil._setupCanvas() will handle it with DPR
    
    // Text label
    const text = document.createElement('div');
    text.className = 'uni-brand-text';
    text.textContent = 'UNI';
    
    // Assemble
    container.appendChild(canvas);
    container.appendChild(text);
    
    // Store references
    this.element = container;
    this.canvas = canvas;
    
    // Initialize sigil after DOM insertion
    requestAnimationFrame(() => {
      this.initSigil();
    });
    
    return container;
  }
  
  /**
   * Initialize and render the sigil (instant, no animation)
   * @private
   */
  initSigil() {
    if (!this.canvas) return;
    
    // Calculate scale (sigil designed for 100x100)
    const scale = this.canvasSize / 100;
    
    // Create sigil instance
    this.sigilInstance = new Sigil({
      canvas: this.canvas,
      canvasSize: this.canvasSize,
      scale: scale,
      lineColor: this.lineColor,
      lineWeight: this.lineWeight,
      drawDuration: 0,     // Instant draw (no animation)
      undrawDuration: 0    // Instant clear (no animation)
    });
    
    // Draw sigil
    try {
      this.sigilInstance.drawSigil({
        calls: UNI_SIGIL_DRAW_CALLS
      });
    } catch (error) {
      console.error('UniBrand: Failed to render sigil:', error);
    }
  }
}

