/**
 * CSV Manager
 * Handles CSV file uploads, parsing, and validation
 */

const API_BASE = '/api';

/**
 * Parse CSV string into array of objects
 * Handles quoted fields with commas inside them
 * @param {string} csvString - Raw CSV content
 * @returns {Array<Object>} Parsed rows
 */
export function parseCSV(csvString) {
  const lines = csvString.trim().split('\n');
  if (lines.length < 2) {
    throw new Error('CSV must have header and at least one data row');
  }
  
  // Parse CSV line handling quoted fields
  function parseLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    // Push last field
    result.push(current.trim());
    
    return result;
  }
  
  const headers = parseLine(lines[0]);
  const rows = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = parseLine(lines[i]);
    const row = {};
    
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    
    rows.push(row);
  }
  
  return rows;
}

/**
 * Validate music CSV structure
 * @param {Array<Object>} rows - Parsed CSV rows
 * @returns {Object} { valid: boolean, errors: string[] }
 */
export function validateMusicCSV(rows) {
  const errors = [];
  const requiredColumns = ['filename', 'description', 'tone', 'density', 'mood', 'scale', 'rhythm'];
  
  if (rows.length === 0) {
    errors.push('CSV is empty');
    return { valid: false, errors };
  }
  
  // Check required columns
  const headers = Object.keys(rows[0]);
  const missing = requiredColumns.filter(col => !headers.includes(col));
  if (missing.length > 0) {
    errors.push(`Missing required columns: ${missing.join(', ')}`);
  }
  
  // Validate scale values
  const validScales = ['major', 'minor'];
  rows.forEach((row, i) => {
    if (row.scale && !validScales.includes(row.scale)) {
      errors.push(`Row ${i + 1}: Invalid scale "${row.scale}" (must be major or minor)`);
    }
  });
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate texture CSV structure
 * @param {Array<Object>} rows - Parsed CSV rows
 * @returns {Object} { valid: boolean, errors: string[] }
 */
export function validateTextureCSV(rows) {
  const errors = [];
  const requiredColumns = ['filename', 'description', 'tone', 'density', 'mood', 'category'];
  
  if (rows.length === 0) {
    errors.push('CSV is empty');
    return { valid: false, errors };
  }
  
  // Check required columns
  const headers = Object.keys(rows[0]);
  const missing = requiredColumns.filter(col => !headers.includes(col));
  if (missing.length > 0) {
    errors.push(`Missing required columns: ${missing.join(', ')}`);
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Upload CSV to server
 * @param {string} type - 'music' or 'texture'
 * @param {string} filename - CSV filename
 * @param {string} content - CSV content
 * @returns {Promise<Object>} Upload result
 */
export async function uploadCSV(type, filename, content) {
  const response = await fetch(`${API_BASE}/sound-prompts/upload-csv`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ type, filename, content })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Upload failed');
  }
  
  return await response.json();
}

/**
 * Get default CSVs from server
 * @returns {Promise<Object>} { music: {content, filename}, texture: {content, filename} }
 */
export async function getDefaultCSVs() {
  const response = await fetch(`${API_BASE}/sound-prompts/csvs/defaults`);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to get defaults');
  }
  
  return await response.json();
}

/**
 * Handle file input and upload
 * @param {File} file - File from input element
 * @param {string} type - 'music' or 'texture'
 * @returns {Promise<Object>} Upload result with validation info
 */
export async function handleFileUpload(file, type) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const content = e.target.result;
        
        // Parse and validate
        const rows = parseCSV(content);
        const validation = type === 'music' 
          ? validateMusicCSV(rows) 
          : validateTextureCSV(rows);
        
        if (!validation.valid) {
          reject(new Error(`CSV validation failed:\n${validation.errors.join('\n')}`));
          return;
        }
        
        // Upload to server
        const result = await uploadCSV(type, file.name, content);
        
        resolve({
          success: true,
          filename: file.name,
          rowCount: rows.length,
          csv: result.csv
        });
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsText(file);
  });
}
