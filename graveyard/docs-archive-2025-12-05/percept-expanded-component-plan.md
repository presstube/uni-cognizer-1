# PerceptExpanded Component Implementation Plan

A focused, detailed display component for the most recent percept in the Dashboard.

---

## Overview

**Component Name**: `PerceptExpanded`

**Location**: Top of left pane (Percepts section) in Dashboard

**Purpose**: Display detailed information about the most recently arrived percept, providing richer context than the compact toast format

**Layout Flow**:
```
Left Pane:
├── Label: "Latest Percept"
├── PerceptExpanded Component (new)
├── Label: "Collected Percepts"  
└── Percept Toast Queue (existing)
```

---

## Percept Data Structure (from DB Analysis)

### Visual Percept
```javascript
{
  type: "visual",
  timestamp: "2025-12-04T20:25:30.541Z",
  description: "The person is silent again.",
  sigilPhrase: "Quiet Focus",
  drawCalls: "ctx.beginPath();\n...",  // Canvas code
  pngData: "iVBORw0KGgo...",           // Base64 PNG (256×256)
  pngWidth: 256,
  pngHeight: 256
}
```

### Audio Percept
```javascript
{
  type: "audio",
  timestamp: "2025-12-04T20:25:40.492Z",
  transcript: "Scrum scrum scrum down. S. S. S. S.",
  analysis: "Speech detected, mentioning 'Scrum down'...",
  tone: "Energetic, possibly playful",
  emoji: "🏈",
  sentiment: "neutral",
  confidence: 0.8,
  sigilPhrase: "Scrum's Descent",
  sigilDrawCalls: "ctx.beginPath()...", // Canvas code
  pngData: "iVBORw0KGgo...",           // Base64 PNG (256×256)
  pngWidth: 256,
  pngHeight: 256
}
```

---

## Component Design

### Visual Structure

```
┌────────────────────────────────────────────┐
│ PerceptExpanded                           │
├────────────────────────────────────────────┤
│                                           │
│  ┌─────────┐  ┌────────────────────────┐ │
│  │         │  │ VISUAL or AUDIO        │ │
│  │  PNG    │  │ 2:25:30 PM            │ │
│  │ 128×128 │  │                        │ │
│  │         │  │ "Quiet Focus"          │ │
│  └─────────┘  └────────────────────────┘ │
│                                           │
│  Description:                             │
│  The person is silent again.              │
│                                           │
│  [Visual: no transcript/analysis shown]   │
│  [Audio: shows tone, sentiment]           │
│                                           │
└────────────────────────────────────────────┘
```

### Component Anatomy

**1. Header Section**
- Type badge (VISUAL or AUDIO with icon)
- Timestamp (formatted, e.g., "2:25:30 PM")

**2. Hero Section**
- Large PNG display (128×128px)
- Sigil phrase (prominent)

**3. Content Section**
- **Description** (always shown)
- **Audio-specific**: transcript, tone, sentiment, confidence
- **Visual-specific**: minimal (just description)

**4. Visual Style**
- Clean, card-like appearance
- Subtle background to distinguish from toasts
- Smooth fade-in animation when new percept arrives
- No hover effects (static display)

---

## Implementation Details

### File Structure

```
web/
├── shared/
│   └── components/
│       └── percept-expanded/
│           ├── percept-expanded.js    (new)
│           └── percept-expanded.css   (new)
└── dashboard/
    ├── app.js                         (modified)
    ├── index.html                     (modified)
    └── dashboard.css                  (no changes)
```

---

## Component Code

### `percept-expanded.js`

```javascript
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
      ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
           <path d="M10 3.75a2 2 0 10-4 0 2 2 0 004 0zM17.25 4.5a.75.75 0 000-1.5h-5.5a.75.75 0 000 1.5h5.5zM5 3.75a.75.75 0 01-.75.75h-1.5a.75.75 0 010-1.5h1.5a.75.75 0 01.75.75zM4.25 17a.75.75 0 000-1.5h-1.5a.75.75 0 000 1.5h1.5zM17.25 17a.75.75 0 000-1.5h-5.5a.75.75 0 000 1.5h5.5zM9 10a.75.75 0 01-.75.75h-5.5a.75.75 0 010-1.5h5.5A.75.75 0 019 10zM17.25 10.75a.75.75 0 000-1.5h-1.5a.75.75 0 000 1.5h1.5zM9 15a.75.75 0 01-.75.75h-5.5a.75.75 0 010-1.5h5.5A.75.75 0 019 15zM17.25 15.75a.75.75 0 000-1.5h-1.5a.75.75 0 000 1.5h1.5z" />
         </svg>`
      : `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
           <path d="M10 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" />
           <path fill-rule="evenodd" d="M.664 10.59a1.651 1.651 0 010-1.186A10.004 10.004 0 0110 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0110 17c-4.257 0-7.893-2.66-9.336-6.41zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clip-rule="evenodd" />
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
    
    // PNG Image
    if (this.percept.pngData) {
      const pngImg = document.createElement('img');
      pngImg.className = 'percept-png';
      pngImg.src = `data:image/png;base64,${this.percept.pngData}`;
      pngImg.alt = this.percept.sigilPhrase || 'Percept sigil';
      pngImg.width = 128;
      pngImg.height = 128;
      hero.appendChild(pngImg);
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
      ? (this.percept.transcript || this.percept.analysis)
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
   * Update with new percept (smooth transition)
   */
  update(percept, type) {
    this.percept = percept;
    this.type = type;
    
    if (this.element) {
      // Fade out
      this.element.style.opacity = '0';
      
      setTimeout(() => {
        // Replace content
        const newElement = this.create();
        this.element.replaceWith(newElement);
        this.element = newElement;
        
        // Fade in
        requestAnimationFrame(() => {
          this.element.style.opacity = '1';
        });
      }, 200);
    }
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
```

---

## Stylesheet

### `percept-expanded.css`

```css
/* ============================================
   PERCEPT EXPANDED COMPONENT
   ============================================ */

.percept-expanded {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: var(--space-md);
  margin-bottom: var(--space-lg);
  opacity: 1;
  transition: opacity 200ms ease;
}

/* Header: Type badge + timestamp */
.percept-expanded-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-md);
}

.percept-type-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: var(--font-size-xs);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.percept-type-badge.audio {
  background: rgba(59, 130, 246, 0.2);
  color: #60a5fa;
}

.percept-type-badge.visual {
  background: rgba(168, 85, 247, 0.2);
  color: #c084fc;
}

.badge-icon {
  width: 14px;
  height: 14px;
  display: flex;
}

.badge-icon svg {
  width: 100%;
  height: 100%;
}

.percept-timestamp {
  font-size: var(--font-size-xs);
  color: rgba(255, 255, 255, 0.5);
  font-variant-numeric: tabular-nums;
}

/* Hero: PNG + Sigil Phrase */
.percept-expanded-hero {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  margin-bottom: var(--space-md);
  padding-bottom: var(--space-md);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.percept-png {
  width: 128px;
  height: 128px;
  flex-shrink: 0;
  opacity: 0.9;
  image-rendering: crisp-edges;
}

.percept-sigil-phrase {
  flex: 1;
  font-size: var(--font-size-lg);
  font-weight: 500;
  color: var(--color-text-bright);
  line-height: 1.3;
}

/* Content: Description + details */
.percept-expanded-content {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.content-label {
  font-size: var(--font-size-xs);
  color: rgba(255, 255, 255, 0.5);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 2px;
}

.content-text {
  font-size: var(--font-size-sm);
  color: var(--color-text);
  line-height: 1.5;
  margin-bottom: var(--space-sm);
}

.content-text:last-child {
  margin-bottom: 0;
}

/* Empty state */
.percept-expanded-empty {
  text-align: center;
  padding: var(--space-lg);
  color: rgba(255, 255, 255, 0.3);
  font-size: var(--font-size-sm);
  font-style: italic;
}
```

---

## Dashboard Integration

### HTML Changes (`dashboard/index.html`)

```html
<!-- Left: Percepts Only -->
<div class="left">
  <div class="label">Latest Percept</div>
  
  <!-- NEW: Percept Expanded Display -->
  <div id="percept-expanded-container"></div>
  
  <div class="label">Collected Percepts</div>
  
  <!-- Existing: Percepts Stream (toast queue) -->
  <div class="percepts-stream" id="percepts">
    <div class="empty">Waiting for percepts...</div>
  </div>
</div>
```

### JavaScript Changes (`dashboard/app.js`)

```javascript
// At top: Import new component
import { PerceptExpanded } from '../shared/components/percept-expanded/percept-expanded.js';

// In DOM elements section:
const $perceptExpandedContainer = document.getElementById('percept-expanded-container');

// Track current expanded percept
let currentPerceptExpanded = null;

// Modify addPercept() function:
function addPercept(data) {
  const { type, data: perceptData } = data;
  
  // 1. Update PerceptExpanded (latest percept)
  if (currentPerceptExpanded) {
    currentPerceptExpanded.update(perceptData, type);
  } else {
    currentPerceptExpanded = new PerceptExpanded(perceptData, type);
    $perceptExpandedContainer.innerHTML = '';
    $perceptExpandedContainer.appendChild(currentPerceptExpanded.create());
  }
  
  // 2. Add to toast queue (existing behavior)
  const toast = new PerceptToast(perceptData, type);
  const toastElement = toast.create();
  
  // Prepend to stream
  if ($percepts.querySelector('.empty')) {
    $percepts.innerHTML = '';
  }
  $percepts.prepend(toastElement);
  
  // Limit toast count
  const toasts = $percepts.querySelectorAll('.percept-toast');
  if (toasts.length > CONFIG.MAX_PERCEPTS) {
    toasts[toasts.length - 1].remove();
  }
}

// Update clearPercepts() to also clear expanded view:
function clearPercepts() {
  $percepts.innerHTML = '<div class="empty">Waiting for percepts...</div>';
  
  // Clear expanded view
  if (currentPerceptExpanded) {
    currentPerceptExpanded.remove();
    currentPerceptExpanded = null;
  }
  $perceptExpandedContainer.innerHTML = '';
}
```

---

## Event Flow

```
1. Percept arrives via socket
   ↓
2. server.js generates PNG (256×256)
   ↓
3. server.js emits 'perceptReceived' event (includes PNG)
   ↓
4. dashboard/app.js receives event
   ↓
5. addPercept() called
   ├─→ Updates/creates PerceptExpanded (top)
   └─→ Adds PerceptToast to queue (below)
```

---

## Design Rationale

### Why This Structure?

1. **Hero PNG at 128×128**: Large enough to see detail, not overwhelming
2. **Sigil phrase next to PNG**: Creates visual balance, emphasizes meaning
3. **Type-specific details**: Audio needs more context (tone, sentiment), visual is self-evident
4. **Minimal styling**: Matches dashboard aesthetic, doesn't compete with center pane
5. **Smooth transitions**: New percepts fade in/out to avoid jarring updates

### Why This Layout?

- **Top position**: Most recent = most important
- **Separate section**: Clear hierarchy vs. toast queue
- **Card-like container**: Visually distinct, feels "featured"
- **No hover effects**: Static display, not interactive

---

## Testing Checklist

- [ ] Component displays correctly for visual percepts
- [ ] Component displays correctly for audio percepts
- [ ] PNG renders at 128×128px
- [ ] Timestamp formats correctly
- [ ] Type badge shows correct icon and color
- [ ] Transition is smooth when new percept arrives
- [ ] Toast queue still works below
- [ ] Labels are correct ("Latest Percept" / "Collected Percepts")
- [ ] Component clears on cycle reset
- [ ] Works with both live and historic percepts

---

## Future Enhancements (Optional)

1. **Click to expand**: Click PNG to see full 256×256 version
2. **Copy transcript**: Button to copy audio transcript
3. **Percept history**: Arrow buttons to navigate previous percepts
4. **Analytics**: Show percept count for current cycle
5. **Filters**: Hide/show by type

---

## File Summary

**New Files:**
- `web/shared/components/percept-expanded/percept-expanded.js`
- `web/shared/components/percept-expanded/percept-expanded.css`

**Modified Files:**
- `web/dashboard/index.html` (add container + labels)
- `web/dashboard/app.js` (import, create, update logic)

**Estimated LOC:**
- Component JS: ~200 lines
- Component CSS: ~120 lines
- Integration changes: ~30 lines
- **Total: ~350 lines**

---

## Ready for Implementation

This plan provides a clean, focused, well-designed component that:
- ✅ Shows detailed info about the latest percept
- ✅ Uses existing PNG data (no additional generation)
- ✅ Integrates cleanly with existing dashboard
- ✅ Maintains consistent styling
- ✅ Handles both visual and audio percepts
- ✅ Provides smooth UX with transitions
- ✅ Follows project architecture patterns

Standing by for implementation approval.
