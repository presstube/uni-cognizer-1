/**
 * History Grid Component
 * Grid of historical mind moment sigils
 */

import { Sigil } from '../../sigil.standalone.js';

export class HistoryGrid {
  constructor(containerElement, onMomentClick) {
    this.container = containerElement;
    this.onMomentClick = onMomentClick;
    this.sigils = new Map();
    this.moments = [];
  }
  
  /**
   * Load and render history from API
   * Uses lightweight grid endpoint for initial load
   */
  async loadHistory() {
    try {
      // Use lightweight grid endpoint - only fetches id, cycle, sigil_code
      const response = await fetch('/api/mind-moments/grid');
      const data = await response.json();
      this.moments = data.moments || [];
      this.render();
    } catch (error) {
      console.error('Failed to load history:', error);
      this.container.innerHTML = '<div class="history-error">Failed to load history</div>';
    }
  }
  
  /**
   * Render the grid
   */
  render() {
    this.container.innerHTML = '';
    this.clear();
    
    if (this.moments.length === 0) {
      this.container.innerHTML = '<div class="history-empty">No mind moments yet</div>';
      return;
    }
    
    // Render newest first (reverse chronological)
    this.moments.forEach(moment => {
      const cell = this.createSigilCell(moment);
      this.container.appendChild(cell);
    });
  }
  
  /**
   * Create a single sigil cell
   */
  createSigilCell(moment) {
    const cell = document.createElement('div');
    cell.className = 'sigil-cell';
    cell.title = `Cycle #${moment.cycle}`;
    cell.dataset.momentId = moment.id;
    
    const canvas = document.createElement('canvas');
    canvas.width = 60;
    canvas.height = 60;
    
    if (moment.sigil_code) {
      try {
        const sigil = new Sigil({
          canvas: canvas,
          canvasSize: 60,
          scale: 1.0,
          lineColor: '#ffffff',
          lineWeight: 1.5,
          drawDuration: 0
        });
        
        sigil.drawSigil({ calls: moment.sigil_code });
        this.sigils.set(moment.id, sigil);
      } catch (error) {
        console.error('Failed to render sigil for moment:', moment.id, error);
      }
    }
    
    // Click handler - fetch full moment details on demand
    cell.addEventListener('click', async () => {
      // Visual feedback immediately
      document.querySelectorAll('.sigil-cell').forEach(c => c.classList.remove('selected'));
      cell.classList.add('selected');
      
      if (this.onMomentClick) {
        // Fetch full moment details from API
        try {
          const response = await fetch(`/api/mind-moments/${moment.id}`);
          const data = await response.json();
          
          if (data.moment) {
            this.onMomentClick(data.moment);
          } else {
            console.error('No moment data returned for:', moment.id);
          }
        } catch (error) {
          console.error('Failed to fetch moment details:', error);
        }
      }
    });
    
    cell.appendChild(canvas);
    return cell;
  }
  
  /**
   * Add a new moment to the top of the grid
   */
  addMoment(moment) {
    // Add to beginning of array
    this.moments.unshift(moment);
    
    // Create and prepend cell
    const cell = this.createSigilCell(moment);
    this.container.insertBefore(cell, this.container.firstChild);
  }
  
  /**
   * Clear sigil instances
   */
  clear() {
    this.sigils.clear();
  }
}

