import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let cachedImageContent = null;

/**
 * Loads the reference image and converts it to base64
 * Caches the result for subsequent calls
 * @returns {Object|null} Image content object for Anthropic API, or null if not found
 */
export function loadReferenceImage() {
  if (cachedImageContent) {
    return cachedImageContent;
  }
  
  try {
    const imagePath = path.join(__dirname, '../../assets/sigil-grid-original.png');
    
    if (!fs.existsSync(imagePath)) {
      console.error(`[Sigil] Reference image not found: ${imagePath}`);
      return null;
    }
    
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Data = imageBuffer.toString('base64');
    
    cachedImageContent = {
      type: 'image',
      source: {
        type: 'base64',
        media_type: 'image/png',
        data: base64Data
      }
    };
    
    console.log('[Sigil] Reference image loaded successfully');
    return cachedImageContent;
  } catch (error) {
    console.error('[Sigil] Error loading reference image:', error.message);
    return null;
  }
}

/**
 * Gets the image content (cached or loads fresh)
 * @returns {Object|null} Image content object
 */
export function getImageContent() {
  return cachedImageContent || loadReferenceImage();
}

