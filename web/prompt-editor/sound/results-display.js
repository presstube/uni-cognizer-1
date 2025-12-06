/**
 * Results Display
 * Renders generation results, reasoning, and sample details
 */

import { renderParameterSection } from './parameter-viz.js';

/**
 * Display complete generation results
 * @param {HTMLElement} container - Results container element
 * @param {Object} result - Generation result from API
 */
export function displayResults(container, result) {
  const { valid, selections, reasoning, musicSample, textureSample, errors, duration } = result;
  
  // Clear previous results
  container.innerHTML = '';
  container.classList.remove('hidden');
  
  // Status banner
  const statusHtml = valid
    ? `<div class="status-banner success">✅ Generated in ${(duration / 1000).toFixed(2)}s</div>`
    : `<div class="status-banner error">❌ Validation Failed</div>`;
  
  container.innerHTML += statusHtml;
  
  // Show errors if any
  if (errors && errors.length > 0) {
    const errorsHtml = `
      <div class="error-message">
        <strong>Validation Errors:</strong><br>
        ${errors.map(e => `• ${e}`).join('<br>')}
      </div>
    `;
    container.innerHTML += errorsHtml;
  }
  
  // If not valid, stop here
  if (!valid) return;
  
  // Reasoning section
  if (reasoning) {
    container.innerHTML += `
      <div class="reasoning-section">
        <h3>💭 AI Reasoning</h3>
        <div class="reasoning-text">${reasoning}</div>
      </div>
    `;
  }
  
  // Audio selections
  const selectionsHtml = `
    <div class="selections-section">
      <h3>🎸 Audio Selections</h3>
      <div class="selections-grid">
        <div class="selection-item">
          <div class="selection-label">Music File</div>
          <div class="selection-value">${selections.music_filename}</div>
        </div>
        <div class="selection-item">
          <div class="selection-label">Texture File</div>
          <div class="selection-value">${selections.texture_filename}</div>
        </div>
        <div class="selection-item">
          <div class="selection-label">Bass Preset</div>
          <div class="selection-value">${selections.bass_preset}</div>
        </div>
      </div>
    </div>
  `;
  container.innerHTML += selectionsHtml;
  
  // Parameters visualization
  const bassParams = {
    speed: selections.bass_speed,
    stability: selections.bass_stability,
    coloration: selections.bass_coloration,
    scale: selections.bass_scale
  };
  
  const melodyParams = {
    speed: selections.melody_speed,
    stability: selections.melody_stability,
    coloration: selections.melody_coloration,
    scale: selections.melody_scale
  };
  
  const parametersHtml = `
    <div class="parameters-section">
      <h3>📊 Parameters</h3>
      ${renderParameterSection('Bass', bassParams, musicSample.scale)}
      ${renderParameterSection('Melody', melodyParams, musicSample.scale)}
    </div>
  `;
  container.innerHTML += parametersHtml;
  
  // Sample details
  const samplesHtml = `
    <div class="samples-section">
      <h3>📋 Selected Samples</h3>
      ${renderSampleCard('Music', musicSample)}
      ${renderSampleCard('Texture', textureSample)}
    </div>
  `;
  container.innerHTML += samplesHtml;
}

/**
 * Render a sample card with details
 * @param {string} type - 'Music' or 'Texture'
 * @param {Object} sample - Sample data from CSV
 * @returns {string} HTML string
 */
function renderSampleCard(type, sample) {
  const properties = type === 'Music'
    ? [
        { label: 'Tone', value: sample.tone },
        { label: 'Density', value: sample.density },
        { label: 'Mood', value: sample.mood },
        { label: 'Scale', value: sample.scale },
        { label: 'Rhythm', value: sample.rhythm }
      ]
    : [
        { label: 'Category', value: sample.category },
        { label: 'Tone', value: sample.tone },
        { label: 'Density', value: sample.density },
        { label: 'Mood', value: sample.mood }
      ];
  
  return `
    <div class="sample-card">
      <div class="sample-header">
        <div class="sample-filename">${type}: ${sample.filename}</div>
        <div class="sample-description">"${sample.description}"</div>
      </div>
      <div class="sample-properties">
        ${properties.map(prop => `
          <div class="sample-property">
            <span class="sample-property-label">${prop.label}:</span>
            <span class="sample-property-value">${prop.value}</span>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

/**
 * Clear all results
 * @param {HTMLElement} container - Results container element
 */
export function clearResults(container) {
  container.innerHTML = '';
  container.classList.add('hidden');
}

/**
 * Show error in results container
 * @param {HTMLElement} container - Results container element
 * @param {string} errorMessage - Error message to display
 */
export function showError(container, errorMessage) {
  container.innerHTML = `
    <div class="status-banner error">❌ Error</div>
    <div class="error-message">${errorMessage}</div>
  `;
  container.classList.remove('hidden');
}
