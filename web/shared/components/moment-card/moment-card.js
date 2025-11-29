/**
 * Moment Card Component
 * Clean card displaying mind moment text, sigil phrase, and sigil visualization
 * Layout: 2:1 ratio (width:height), split into left text pane and right sigil pane
 */

import { Sigil } from '../../sigil.standalone.js';

export class MomentCard {
  /**
   * Create a new moment card
   * @param {Object} data - Mind moment data
   * @param {string} data.mindMoment - The mind moment text
   * @param {string} data.sigilPhrase - The sigil phrase
   * @param {string} data.sigilCode - Sigil drawing commands (JSON string)
   */
  constructor(data) {
    this.data = data;
    this.element = null;
    this.sigilInstance = null;
  }

  /**
   * Create and return the card DOM element
   * @returns {HTMLElement}
   */
  create() {
    // Create container
    const card = document.createElement('div');
    card.className = 'moment-card';
    
    // Left pane - text content
    const leftPane = document.createElement('div');
    leftPane.className = 'moment-card-left';
    
    // Mind moment text
    const mindMoment = document.createElement('div');
    mindMoment.className = 'moment-card-text';
    mindMoment.textContent = this.data.mindMoment || '—';
    
    // Sigil phrase
    const sigilPhrase = document.createElement('div');
    sigilPhrase.className = 'moment-card-phrase';
    sigilPhrase.textContent = this.data.sigilPhrase || '—';
    
    leftPane.appendChild(mindMoment);
    leftPane.appendChild(sigilPhrase);
    
    // Right pane - sigil visualization
    const rightPane = document.createElement('div');
    rightPane.className = 'moment-card-right';
    
    const canvas = document.createElement('canvas');
    canvas.className = 'moment-card-canvas';
    canvas.width = 120;
    canvas.height = 120;
    
    rightPane.appendChild(canvas);
    
    // Assemble
    card.appendChild(leftPane);
    card.appendChild(rightPane);
    
    // Store references
    this.element = card;
    this.canvas = canvas;
    
    // Initialize sigil after DOM insertion
    requestAnimationFrame(() => {
      this.initSigil();
    });
    
    return card;
  }

  /**
   * Initialize and render the sigil
   * @private
   */
  initSigil() {
    if (!this.canvas || !this.data.sigilCode) return;
    
    try {
      this.sigilInstance = new Sigil({
        canvas: this.canvas,
        canvasSize: 120,
        scale: 1.0,
        lineColor: '#ffffff',
        lineWeight: 2.0,
        drawDuration: 0 // Instant draw
      });
      
      this.sigilInstance.drawSigil({
        calls: this.data.sigilCode
      });
    } catch (error) {
      console.error('Failed to render sigil:', error);
    }
  }

  /**
   * Remove the card from DOM
   */
  remove() {
    if (this.element && this.element.parentNode) {
      this.element.remove();
    }
  }
}

