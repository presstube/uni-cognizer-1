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
    
    // Left pane - sigil visualization
    const leftPane = document.createElement('div');
    leftPane.className = 'moment-card-left';
    
    const canvas = document.createElement('canvas');
    canvas.className = 'moment-card-canvas';
    canvas.width = 120;
    canvas.height = 120;
    
    leftPane.appendChild(canvas);
    
    // Right pane - text content
    const rightPane = document.createElement('div');
    rightPane.className = 'moment-card-right';
    
    // Mind moment text
    const mindMoment = document.createElement('div');
    mindMoment.className = 'moment-card-text';
    mindMoment.textContent = this.data.mindMoment || '—';
    
    // Sigil phrase
    const sigilPhrase = document.createElement('div');
    sigilPhrase.className = 'moment-card-phrase';
    sigilPhrase.textContent = this.data.sigilPhrase || '—';
    
    rightPane.appendChild(mindMoment);
    rightPane.appendChild(sigilPhrase);
    
    // Assemble
    card.appendChild(leftPane);
    card.appendChild(rightPane);
    
    // Store references
    this.element = card;
    this.canvas = canvas;
    this.mindMomentElement = mindMoment;
    this.sigilPhraseElement = sigilPhrase;
    
    // Initialize sigil after DOM insertion
    requestAnimationFrame(() => {
      this.initSigil();
    });
    
    return card;
  }

  /**
   * Update the card with new data (reuses existing card)
   * @param {Object} data - New mind moment data
   */
  update(data) {
    this.data = data;
    
    // Update text content
    if (this.mindMomentElement) {
      this.mindMomentElement.textContent = data.mindMoment || '—';
    }
    
    if (this.sigilPhraseElement) {
      this.sigilPhraseElement.textContent = data.sigilPhrase || '—';
    }
    
    // Update sigil (will animate undraw/redraw)
    if (data.sigilCode && this.sigilInstance) {
      this.sigilInstance.drawSigil({
        calls: data.sigilCode
      });
    } else if (this.sigilInstance) {
      // Clear sigil if no code provided
      this.sigilInstance.clear(true);
    }
  }

  /**
   * Initialize and render the sigil
   * @private
   */
  initSigil() {
    if (!this.canvas) return;
    
    // Create sigil instance once
    if (!this.sigilInstance) {
      this.sigilInstance = new Sigil({
        canvas: this.canvas,
        canvasSize: 120,
        scale: 1.0,
        lineColor: '#ffffff',
        lineWeight: 2.0,
        drawDuration: 400, // Enable animation for undraw/redraw
        undrawDuration: 400, // Enable animation for undraw/redraw
      });
    }
    
    // Draw initial sigil if provided
    if (this.data.sigilCode) {
      try {
        this.sigilInstance.drawSigil({
          calls: this.data.sigilCode
        });
      } catch (error) {
        console.error('Failed to render sigil:', error);
      }
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

