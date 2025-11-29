/**
 * Percept Toast Component
 * Minimal, self-contained percept display with icon, description, and sigil
 */

import { Sigil } from './sigil.standalone.js';

export class PerceptToast {
  /**
   * Create a new percept toast
   * @param {Object} percept - The percept data (audio or visual)
   * @param {string} type - 'audio' or 'visual'
   */
  constructor(percept, type) {
    this.percept = percept;
    this.type = type;
    this.element = null;
    this.sigilInstance = null;
  }

  /**
   * Create and return the toast DOM element
   * @returns {HTMLElement}
   */
  create() {
    // Create container
    const toast = document.createElement('div');
    toast.className = 'percept-toast';
    
    // Icon (heroicons from CDN)
    const iconSvg = this.type === 'audio'
      ? `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="toast-icon">
           <path stroke-linecap="round" stroke-linejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
         </svg>`
      : `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="toast-icon">
           <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
           <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
         </svg>`;
    
    const iconContainer = document.createElement('div');
    iconContainer.className = 'toast-icon-container';
    iconContainer.innerHTML = iconSvg;
    
    // Description text (left side of center pane)
    const description = document.createElement('div');
    description.className = 'toast-description';
    description.textContent = this.type === 'audio' 
      ? (this.percept.transcript || this.percept.analysis || 'No content')
      : this.percept.description;
    
    // Sigil phrase (right side of center pane)
    const sigilPhrase = document.createElement('div');
    sigilPhrase.className = 'toast-sigil-phrase';
    const phraseText = this.percept.sigilPhrase || '';
    sigilPhrase.textContent = phraseText.replace(/\s+/g, '\n'); // Line break between words
    
    // Center pane container (holds description and sigil phrase)
    const centerPane = document.createElement('div');
    centerPane.className = 'toast-center-pane';
    centerPane.appendChild(description);
    centerPane.appendChild(sigilPhrase);
    
    // Sigil canvas (larger: 80x80)
    const sigilContainer = document.createElement('div');
    sigilContainer.className = 'toast-sigil-container';
    
    const canvas = document.createElement('canvas');
    canvas.className = 'toast-sigil-canvas';
    canvas.width = 80;
    canvas.height = 80;
    
    sigilContainer.appendChild(canvas);
    
    // Assemble
    toast.appendChild(iconContainer);
    toast.appendChild(centerPane);
    toast.appendChild(sigilContainer);
    
    // Store reference
    this.element = toast;
    this.canvas = canvas;
    
    // Initialize sigil after DOM insertion
    requestAnimationFrame(() => {
      this.initSigil();
    });
    
    return toast;
  }

  /**
   * Initialize and render the sigil
   * @private
   */
  initSigil() {
    if (!this.canvas) return;
    
    // Get sigil draw calls from percept (audio: sigilDrawCalls, visual: drawCalls)
    const drawCalls = this.percept.sigilDrawCalls || this.percept.drawCalls;
    if (!drawCalls) {
      console.warn('No sigil draw calls found in percept:', this.percept);
      return;
    }
    
    try {
      this.sigilInstance = new Sigil({
        canvas: this.canvas,
        canvasSize: 50,
        scale: 1.0, // Smaller scale
        sigilAlphaCoordSize: 100,
        lineColor: '#ffffff',
        lineWeight: 3.0, // Fatter lines
        drawDuration: 0 // Instant draw for toast
      });
      
      this.sigilInstance.drawSigil({
        calls: drawCalls
      });
    } catch (error) {
      console.error('Failed to render sigil:', error);
      console.error('Draw calls:', drawCalls);
    }
  }

  /**
   * Remove the toast from DOM
   */
  remove() {
    if (this.element && this.element.parentNode) {
      this.element.remove();
    }
  }
}

/**
 * NOTE: Styles for percept toasts are now in percept-toast.css
 * Include that CSS file in your HTML:
 * <link rel="stylesheet" href="../shared/components/percept-toast/percept-toast.css">
 */

