/**
 * UNI Audio Instrument - Output Validator
 * 
 * Parses and validates LLM output for audio selections
 */

/**
 * Parse LLM output in key: value format with reasoning
 * 
 * @param {string} text - Raw LLM output
 * @returns {Object} - Parsed selections with reasoning
 */
function parseOutput(text) {
  const lines = text.trim().split('\n');
  const selections = {};
  let reasoning = '';
  let inReasoningSection = false;
  let inSelectionsSection = false;
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Check for section headers
    if (trimmed === 'REASONING:') {
      inReasoningSection = true;
      inSelectionsSection = false;
      continue;
    }
    if (trimmed === 'SELECTIONS:') {
      inSelectionsSection = true;
      inReasoningSection = false;
      continue;
    }
    
    // Collect reasoning text
    if (inReasoningSection && trimmed) {
      reasoning += (reasoning ? ' ' : '') + trimmed;
      continue;
    }
    
    // Parse selections (key: value format)
    if (inSelectionsSection || !reasoning) { // Fall back to old behavior if no sections
      const colonIndex = line.indexOf(':');
      if (colonIndex === -1) continue;
      
      const key = line.substring(0, colonIndex).trim();
      const value = line.substring(colonIndex + 1).trim();
      
      if (key && value) {
        selections[key] = value;
      }
    }
  }
  
  // Store reasoning in the selections object
  if (reasoning) {
    selections._reasoning = reasoning;
  }
  
  return selections;
}

/**
 * Parse CSV string into array of objects
 * Properly handles quoted fields with commas
 * 
 * @param {string} csvString - CSV content
 * @returns {Array<Object>} - Array of row objects
 */
export function parseCSV(csvString) {
  const lines = csvString.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  
  return lines.slice(1).map(line => {
    const values = [];
    let currentValue = '';
    let inQuotes = false;
    
    // Parse line character by character to handle quoted fields
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(currentValue.trim());
        currentValue = '';
      } else {
        currentValue += char;
      }
    }
    values.push(currentValue.trim()); // Last value
    
    // Map values to headers
    return headers.reduce((obj, header, i) => {
      obj[header] = values[i]?.replace(/^"|"$/g, '');
      return obj;
    }, {});
  });
}

/**
 * Validate audio selections against constraints
 * 
 * @param {string} output - Raw LLM output
 * @param {Array<Object>} musicSamples - Parsed music_samples.csv
 * @param {Array<Object>} textureSamples - Parsed texture_samples.csv (optional)
 * @returns {Object} - Validation result with { valid, selections, errors }
 */
export function validateSelections(output, musicSamples, textureSamples = null) {
  const selections = parseOutput(output);
  const errors = [];
  
  // Check all 11 required fields
  const required = [
    'music_filename', 'texture_filename', 'bass_preset',
    'bass_speed', 'bass_stability', 'bass_coloration', 'bass_scale',
    'melody_speed', 'melody_stability', 'melody_coloration', 'melody_scale'
  ];
  
  required.forEach(field => {
    if (!(field in selections)) {
      errors.push(`Missing field: ${field}`);
    }
  });
  
  // Validate music_filename exists
  const musicSample = musicSamples.find(s => 
    s.filename === selections.music_filename
  );
  
  if (selections.music_filename && !musicSample) {
    errors.push(`Invalid music_filename: ${selections.music_filename}`);
  }
  
  // Validate texture_filename exists (if texture samples provided)
  if (textureSamples && selections.texture_filename) {
    const textureSample = textureSamples.find(s =>
      s.filename === selections.texture_filename
    );
    if (!textureSample) {
      errors.push(`Invalid texture_filename: ${selections.texture_filename}`);
    }
  }
  
  // ⚠️ CRITICAL: Scale constraint validation
  if (musicSample) {
    const isMajor = musicSample.scale === 'major';
    const bassScale = parseFloat(selections.bass_scale);
    const melodyScale = parseFloat(selections.melody_scale);
    
    if (!isNaN(bassScale) && !isNaN(melodyScale)) {
      if (isMajor && (bassScale < 0.5 || melodyScale < 0.5)) {
        errors.push(
          `Scale mismatch: major music (${selections.music_filename}) ` +
          `requires bass_scale≥0.5 and melody_scale≥0.5 ` +
          `(got bass=${bassScale}, melody=${melodyScale})`
        );
      }
      if (!isMajor && (bassScale >= 0.5 || melodyScale >= 0.5)) {
        errors.push(
          `Scale mismatch: minor music (${selections.music_filename}) ` +
          `requires bass_scale<0.5 and melody_scale<0.5 ` +
          `(got bass=${bassScale}, melody=${melodyScale})`
        );
      }
    }
  }
  
  // Validate bass_preset
  const validPresets = ['bass_lfo_gain', 'bass_delay', 'bass_lfo_filter', 'bass_basic'];
  if (selections.bass_preset && !validPresets.includes(selections.bass_preset)) {
    errors.push(`Invalid bass_preset: ${selections.bass_preset}. Must be one of: ${validPresets.join(', ')}`);
  }
  
  // Validate numeric ranges (0.0-1.0)
  const numericFields = [
    'bass_speed', 'bass_stability', 'bass_coloration', 'bass_scale',
    'melody_speed', 'melody_stability', 'melody_coloration', 'melody_scale'
  ];
  
  numericFields.forEach(field => {
    if (selections[field] !== undefined) {
      const val = parseFloat(selections[field]);
      if (isNaN(val) || val < 0 || val > 1) {
        errors.push(`${field} must be 0.0-1.0, got: ${selections[field]}`);
      }
    }
  });
  
  // Extract reasoning (if present) and remove from selections for validation
  const reasoning = selections._reasoning || null;
  const cleanSelections = { ...selections };
  delete cleanSelections._reasoning;
  
  return {
    valid: errors.length === 0,
    selections: cleanSelections,
    reasoning,
    errors
  };
}
