/**
 * PerceptExpanded Component
 * Detailed display for the most recent percept
 */

export class PerceptExpanded {
  constructor(percept, type) {
    this.percept = percept;
    this.type = type;
    this.element = null;
  }

  /**
   * Create and return the expanded percept DOM element
   * @returns {HTMLElement}
   */
  create() {
    const container = document.createElement('div');
    container.className = 'percept-expanded';
    
    // Header: Type badge + timestamp
    const header = this.createHeader();
    
    // Hero: PNG + Sigil Phrase
    const hero = this.createHero();
    
    // Content: Description + type-specific details
    const content = this.createContent();
    
    container.appendChild(header);
    container.appendChild(hero);
    container.appendChild(content);
    
    this.element = container;
    return container;
  }

  /**
   * Create header section (type + timestamp)
   * @private
   */
  createHeader() {
    const header = document.createElement('div');
    header.className = 'percept-expanded-header';
    
    // Type badge with icon
    const typeBadge = document.createElement('div');
    typeBadge.className = `percept-type-badge ${this.type}`;
    
    const icon = this.type === 'audio'
      ? `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
           <path stroke-linecap="round" stroke-linejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
         </svg>`
      : `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
           <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
           <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
         </svg>`;
    
    typeBadge.innerHTML = `
      <span class="badge-icon">${icon}</span>
      <span class="badge-text">${this.type.toUpperCase()}</span>
    `;
    
    // Timestamp
    const timestamp = document.createElement('div');
    timestamp.className = 'percept-timestamp';
    timestamp.textContent = this.formatTimestamp(this.percept.timestamp);
    
    header.appendChild(typeBadge);
    header.appendChild(timestamp);
    
    return header;
  }

  /**
   * Create hero section (PNG + sigil phrase)
   * @private
   */
  createHero() {
    const hero = document.createElement('div');
    hero.className = 'percept-expanded-hero';
    
    // PNG Image (check for pngData)
    if (this.percept.pngData) {
      const pngImg = document.createElement('img');
      pngImg.className = 'percept-png';
      pngImg.src = `data:image/png;base64,${this.percept.pngData}`;
      pngImg.alt = this.percept.sigilPhrase || 'Percept sigil';
      pngImg.width = 128;
      pngImg.height = 128;
      hero.appendChild(pngImg);
    } else {
      // Fallback: Show placeholder if no PNG
      const placeholder = document.createElement('div');
      placeholder.className = 'percept-png-placeholder';
      placeholder.textContent = 'No PNG';
      hero.appendChild(placeholder);
      console.warn('No pngData in percept:', this.percept);
    }
    
    // Sigil Phrase
    const phrase = document.createElement('div');
    phrase.className = 'percept-sigil-phrase';
    phrase.textContent = this.percept.sigilPhrase || '—';
    hero.appendChild(phrase);
    
    return hero;
  }

  /**
   * Create content section (description + details)
   * @private
   */
  createContent() {
    const content = document.createElement('div');
    content.className = 'percept-expanded-content';
    
    // Description (always shown)
    const descLabel = document.createElement('div');
    descLabel.className = 'content-label';
    descLabel.textContent = 'Description';
    
    const descText = document.createElement('div');
    descText.className = 'content-text';
    descText.textContent = this.type === 'audio'
      ? (this.percept.transcript || this.percept.analysis || 'No content')
      : (this.percept.description || 'No description');
    
    content.appendChild(descLabel);
    content.appendChild(descText);
    
    // Audio-specific details
    if (this.type === 'audio') {
      // Tone
      if (this.percept.tone) {
        const toneLabel = document.createElement('div');
        toneLabel.className = 'content-label';
        toneLabel.textContent = 'Tone';
        
        const toneText = document.createElement('div');
        toneText.className = 'content-text';
        toneText.textContent = this.percept.tone;
        
        content.appendChild(toneLabel);
        content.appendChild(toneText);
      }
      
      // Sentiment + Confidence
      if (this.percept.sentiment) {
        const sentLabel = document.createElement('div');
        sentLabel.className = 'content-label';
        sentLabel.textContent = 'Sentiment';
        
        const sentText = document.createElement('div');
        sentText.className = 'content-text';
        const confidence = this.percept.confidence 
          ? ` (${Math.round(this.percept.confidence * 100)}%)`
          : '';
        sentText.textContent = `${this.percept.sentiment}${confidence}`;
        
        content.appendChild(sentLabel);
        content.appendChild(sentText);
      }
    }
    
    return content;
  }

  /**
   * Format timestamp to readable time
   * @private
   */
  formatTimestamp(timestamp) {
    if (!timestamp) return '—';
    
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  }

  /**
   * Update with new percept (reuse existing element)
   */
  update(percept, type) {
    this.percept = percept;
    this.type = type;
    
    if (!this.element) {
      console.warn('PerceptExpanded: Cannot update, element does not exist');
      return;
    }
    
    // Simply clear and rebuild content
    this.element.innerHTML = '';
    
    // Rebuild sections
    const header = this.createHeader();
    const hero = this.createHero();
    const content = this.createContent();
    
    this.element.appendChild(header);
    this.element.appendChild(hero);
    this.element.appendChild(content);
  }

  /**
   * Remove element
   */
  remove() {
    if (this.element && this.element.parentNode) {
      this.element.remove();
    }
  }
}
