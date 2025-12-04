/**
 * Browser API polyfills for Node.js
 * This MUST be imported before svg-path-sdf
 */

import { createCanvas } from 'canvas';

// Polyfill document.createElement for browser-only libraries
if (typeof document === 'undefined') {
  global.document = {
    createElement: (tag) => {
      if (tag === 'canvas') {
        return createCanvas(256, 256);
      }
      throw new Error(`Unsupported element type: ${tag}`);
    }
  };
}

// Polyfill window if needed
if (typeof window === 'undefined') {
  global.window = global;
}

export function ensureBrowserAPIs() {
  // Just ensures the polyfills are loaded
  return true;
}

