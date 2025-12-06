/**
 * Parameter Visualization
 * Renders parameter bars and scale indicators
 */

/**
 * Render a single parameter bar with label and value
 * @param {string} label - Parameter label
 * @param {number} value - Parameter value (0-1)
 * @returns {string} HTML string
 */
export function renderParameterBar(label, value) {
  const percentage = Math.round(value * 100);
  
  return `
    <div class="parameter-row">
      <div class="parameter-label">${label}</div>
      <div class="parameter-bar-container">
        <div class="parameter-bar" style="width: ${percentage}%"></div>
      </div>
      <div class="parameter-value">${value.toFixed(2)}</div>
    </div>
  `;
}

/**
 * Render a parameter with scale indicator (for bass_scale and melody_scale)
 * @param {string} label - Parameter label
 * @param {number} value - Scale value (0-1)
 * @param {string} musicScale - Music sample scale ('major' or 'minor')
 * @returns {string} HTML string
 */
export function renderScaleParameter(label, value, musicScale) {
  const percentage = Math.round(value * 100);
  const scaleType = value < 0.5 ? 'minor' : 'major';
  const isValid = (value < 0.5 && musicScale === 'minor') || (value >= 0.5 && musicScale === 'major');
  const indicator = isValid ? '✓' : '✗';
  const indicatorClass = isValid ? 'valid' : 'invalid';
  
  return `
    <div class="parameter-row">
      <div class="parameter-label">${label}</div>
      <div class="parameter-bar-container">
        <div class="parameter-bar" style="width: ${percentage}%"></div>
      </div>
      <div class="parameter-value">
        ${value.toFixed(2)}
        <span class="parameter-scale-info ${indicatorClass}">${scaleType} ${indicator}</span>
      </div>
    </div>
  `;
}

/**
 * Render a complete parameter section (bass or melody)
 * @param {string} title - Section title ('Bass' or 'Melody')
 * @param {Object} params - Parameter values
 * @param {string} musicScale - Music sample scale
 * @returns {string} HTML string
 */
export function renderParameterSection(title, params, musicScale) {
  const { speed, stability, coloration, scale } = params;
  
  return `
    <div class="parameter-group">
      <div class="parameter-group-title">${title}</div>
      ${renderParameterBar('Speed', parseFloat(speed))}
      ${renderParameterBar('Stability', parseFloat(stability))}
      ${renderParameterBar('Coloration', parseFloat(coloration))}
      ${renderScaleParameter('Scale', parseFloat(scale), musicScale)}
    </div>
  `;
}
