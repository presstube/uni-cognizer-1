import { Sigil } from './sigil.standalone.js';
import { typewrite } from './typewriter.js';

/**
 * SigilAndPhrase - Fully turnkey component for sigil rendering + phrase typewriting
 * 
 * Creates its own DOM structure and handles all styling internally.
 * Just point it at a container and it does everything else.
 * 
 * Usage:
 *   const sap = new SigilAndPhrase({ container: '#sigil-container' });
 *   sap.awaiting();  // When starting request
 *   sap.render({ phrase: 'Steel Fists', drawCalls: 'ctx.beginPath()...' });
 */
export class SigilAndPhrase {
  constructor(config = {}) {
    const {
      container,
      // Sigil configuration (with presets)
      canvasSize = 200,
      drawDuration = 200,
      undrawDuration = 300,
      thinkingShiftInterval = 100,
      thinkingVariedMin = 1000,
      thinkingVariedMax = 3000,
      scale = 1.0,
      lineColor = '#fff',
      lineWeight = 1.2,
      // Typewriter configuration
      awaitingMessage = 'awaiting sigil...',
      awaitingSpeed = 20,
      phraseSpeed = 10,
      // Styling configuration
      backgroundColor = '#000',
      phraseColor = '#666',
      phraseFontSize = '14px'
    } = config;
    
    if (!container) {
      throw new Error('SigilAndPhrase: container is required');
    }
    
    // Store config
    this.awaitingMessage = awaitingMessage;
    this.awaitingSpeed = awaitingSpeed;
    this.phraseSpeed = phraseSpeed;
    this.backgroundColor = backgroundColor;
    this.phraseColor = phraseColor;
    this.phraseFontSize = phraseFontSize;
    this.canvasSize = canvasSize;
    
    // Resolve container element
    this.container = this._resolveContainer(container);
    
    // Inject styles (once per page)
    this._injectStyles();
    
    // Create DOM structure
    this._createElements();
    
    // Initialize Sigil instance
    this.sigil = new Sigil({
      canvas: this.canvas,
      canvasSize,
      drawDuration,
      undrawDuration,
      thinkingShiftInterval,
      thinkingVariedMin,
      thinkingVariedMax,
      scale,
      lineColor,
      lineWeight
    });
    
    // Start in awaiting state
    this.awaiting();
  }
  
  /**
   * INTERNAL: Resolve container from string selector or DOM element
   */
  _resolveContainer(container) {
    if (typeof container === 'string') {
      const element = document.querySelector(container);
      if (!element) {
        throw new Error(`SigilAndPhrase: Container not found: ${container}`);
      }
      return element;
    }
    if (container instanceof HTMLElement) {
      return container;
    }
    throw new Error('SigilAndPhrase: Invalid container (must be selector string or HTMLElement)');
  }
  
  /**
   * INTERNAL: Create DOM structure
   */
  _createElements() {
    // Create wrapper
    this.wrapper = document.createElement('div');
    this.wrapper.className = 'sigil-and-phrase-wrapper';
    this.wrapper.style.backgroundColor = this.backgroundColor;
    
    // Create canvas
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'sigil-and-phrase-canvas';
    this.canvas.width = this.canvasSize;
    this.canvas.height = this.canvasSize;
    
    // Create phrase element
    this.phraseElement = document.createElement('div');
    this.phraseElement.className = 'sigil-and-phrase-text';
    this.phraseElement.style.color = this.phraseColor;
    this.phraseElement.style.fontSize = this.phraseFontSize;
    
    // Assemble
    this.wrapper.appendChild(this.canvas);
    this.wrapper.appendChild(this.phraseElement);
    this.container.appendChild(this.wrapper);
  }
  
  /**
   * NOTE: Styles are now in sigil-and-phrase.css
   * Include that CSS file in your HTML:
   * <link rel="stylesheet" href="../shared/components/sigil-and-phrase/sigil-and-phrase.css">
   * 
   * @deprecated This method no longer injects styles - kept for backwards compatibility
   */
  _injectStyles() {
    // Styles are now external - no-op for backwards compatibility
  }
  
  /**
   * PUBLIC API: Set awaiting state
   * Shows "awaiting sigil..." with typewriter + thinking animation
   */
  awaiting() {
    typewrite(this.phraseElement, this.awaitingMessage, this.awaitingSpeed);
    this.sigil.thinkingVaried();
  }
  
  /**
   * PUBLIC API: Render sigil + phrase
   * @param {Object} data - { phrase, drawCalls }
   */
  render({ phrase, drawCalls }) {
    if (!phrase || !drawCalls) {
      console.warn('SigilAndPhrase.render: Missing phrase or drawCalls');
      return;
    }
    
    try {
      // Fix orphaned lines (ensure moveTo before arc calls)
      const fixedDrawCalls = this._fixDrawCalls(drawCalls);
      
      // Typewrite phrase (lowercase for aesthetic consistency)
      typewrite(this.phraseElement, phrase.toLowerCase(), this.phraseSpeed);
      
      // Draw sigil (automatically stops thinking animation)
      this.sigil.drawSigil({ calls: fixedDrawCalls });
      
    } catch (error) {
      console.error('SigilAndPhrase.render failed:', error);
      // Fall back to awaiting state
      this.awaiting();
    }
  }
  
  /**
   * INTERNAL: Fix orphaned lines in draw calls
   * Prevents connecting lines to arc starting points
   */
  _fixDrawCalls(drawCalls) {
    return drawCalls.replace(
      /ctx\.arc\(/g,
      (match, offset) => {
        const before = drawCalls.substring(Math.max(0, offset - 50), offset);
        const hasRecentMoveTo = /moveTo\([^)]+\)\s*$/.test(before.trim());
        return hasRecentMoveTo ? match : `ctx.moveTo(arguments[0], arguments[1]);${match}`;
      }
    );
  }
  
  /**
   * PUBLIC API: Destroy component and clean up
   */
  destroy() {
    if (this.wrapper && this.wrapper.parentNode) {
      this.wrapper.parentNode.removeChild(this.wrapper);
    }
  }
}

