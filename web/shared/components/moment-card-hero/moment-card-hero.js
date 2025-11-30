/**
 * Moment Card Hero Component
 * Large prominent card for main dashboard display
 * Layout: Square sigil (50% width) on left, text content on right
 * Text hierarchy: Large sigil phrase on top, mind moment below
 */

import { Sigil } from '../../sigil.standalone.js';

export class MomentCardHero {
  /**
   * Create a new hero moment card
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
   * Create and return the hero card DOM element
   * @returns {HTMLElement}
   */
  create() {
    // Create container - vertical stack
    const card = document.createElement('div');
    card.className = 'moment-card-hero';
    
    // Sigil - full width at top
    const canvas = document.createElement('canvas');
    canvas.className = 'moment-card-hero-canvas';
    canvas.width = 400;
    canvas.height = 400;
    
    // Sigil phrase - centered below sigil
    const sigilPhrase = document.createElement('div');
    sigilPhrase.className = 'moment-card-hero-phrase';
    // Format phrase: each word on newline except micro words
    const phraseText = this.formatSigilPhrase(this.data.sigilPhrase || '—');
    sigilPhrase.textContent = phraseText;
    
    // Mind moment text - left aligned below phrase
    const mindMoment = document.createElement('div');
    mindMoment.className = 'moment-card-hero-text';
    mindMoment.textContent = this.data.mindMoment || '—';
    
    // Assemble vertical stack
    card.appendChild(canvas);
    card.appendChild(sigilPhrase);
    card.appendChild(mindMoment);
    
    // Store references
    this.element = card;
    this.canvas = canvas;
    this.sigilPhraseElement = sigilPhrase;
    this.mindMomentElement = mindMoment;
    
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
    if (this.sigilPhraseElement) {
      const phraseText = this.formatSigilPhrase(data.sigilPhrase || '—');
      this.sigilPhraseElement.textContent = phraseText;
    }
    
    if (this.mindMomentElement) {
      this.mindMomentElement.textContent = data.mindMoment || '—';
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
   * Format sigil phrase with each word on newline (except micro words)
   * @private
   */
  formatSigilPhrase(phrase) {
    if (!phrase || phrase === '—') return phrase;
    
    const microWords = ['a', 'an', 'the', 'is', 'of', 'in', 'on', 'at', 'to', 'for', 'and', 'or'];
    const words = phrase.split(' ');
    const formatted = [];
    let currentLine = '';
    
    words.forEach((word, index) => {
      const isLastWord = index === words.length - 1;
      const isMicro = microWords.includes(word.toLowerCase());
      
      if (isMicro && !isLastWord) {
        // Add micro word to current line
        currentLine += (currentLine ? ' ' : '') + word;
      } else {
        // Add word and start new line
        currentLine += (currentLine ? ' ' : '') + word;
        formatted.push(currentLine);
        currentLine = '';
      }
    });
    
    // Add any remaining line
    if (currentLine) {
      formatted.push(currentLine);
    }
    
    return formatted.join('\n');
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
        canvasSize: 400,
        scale: 1.0,
        lineColor: '#ffffff',
        lineWeight: 1,
        drawDuration: 600,
        undrawDuration: 600,
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
