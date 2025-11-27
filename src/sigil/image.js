import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cache for default image only
let cachedDefaultImage = null;

// Cache for custom images (keyed by path)
const customImageCache = new Map();

/**
 * Loads the default reference image and converts it to base64
 * Caches the result for subsequent calls
 * @returns {Object|null} Image content object for Anthropic API, or null if not found
 */
export function loadReferenceImage() {
  if (cachedDefaultImage) {
    return cachedDefaultImage;
  }
  
  try {
    const imagePath = path.join(__dirname, '../../assets/sigil-grid-original.png');
    
    if (!fs.existsSync(imagePath)) {
      console.error(`[Sigil] Reference image not found: ${imagePath}`);
      return null;
    }
    
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Data = imageBuffer.toString('base64');
    
    cachedDefaultImage = {
      type: 'image',
      source: {
        type: 'base64',
        media_type: 'image/png',
        data: base64Data
      }
    };
    
    console.log('[Sigil] Default reference image loaded');
    return cachedDefaultImage;
  } catch (error) {
    console.error('[Sigil] Error loading reference image:', error.message);
    return null;
  }
}

/**
 * Loads a custom reference image from a relative path
 * @param {string} relativePath - Path relative to /assets/ (e.g., 'sigil-references/abc123.png')
 * @returns {Object|null} Image content object for Anthropic API, or null if not found
 */
export function loadCustomImage(relativePath) {
  if (!relativePath) {
    return loadReferenceImage();
  }
  
  // Check cache
  if (customImageCache.has(relativePath)) {
    return customImageCache.get(relativePath);
  }
  
  try {
    const imagePath = path.join(__dirname, '../../assets/', relativePath);
    
    if (!fs.existsSync(imagePath)) {
      console.warn(`[Sigil] Custom image not found: ${imagePath}, falling back to default`);
      return loadReferenceImage();
    }
    
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Data = imageBuffer.toString('base64');
    
    // Detect media type from extension
    const ext = path.extname(relativePath).toLowerCase();
    const mediaType = ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'image/png';
    
    const imageContent = {
      type: 'image',
      source: {
        type: 'base64',
        media_type: mediaType,
        data: base64Data
      }
    };
    
    // Cache it
    customImageCache.set(relativePath, imageContent);
    
    console.log(`[Sigil] Custom reference image loaded: ${relativePath}`);
    return imageContent;
  } catch (error) {
    console.error(`[Sigil] Error loading custom image ${relativePath}:`, error.message);
    return loadReferenceImage();
  }
}

/**
 * Gets the image content (cached or loads fresh)
 * @param {string|null} customPath - Optional custom image path
 * @returns {Object|null} Image content object
 */
export function getImageContent(customPath = null) {
  if (customPath) {
    return loadCustomImage(customPath);
  }
  return cachedDefaultImage || loadReferenceImage();
}

