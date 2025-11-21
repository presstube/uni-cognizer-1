/**
 * Typewriter effect - types text character by character
 * Pure function with no internal state
 */

/**
 * Typewrite text into an element
 * @param {HTMLElement} element - Target element
 * @param {string} text - Text to type
 * @param {number} speed - Milliseconds per character (default: 50)
 * @param {Function} onComplete - Optional callback when done
 */
export function typewrite(element, text, speed = 50, onComplete = null) {
  // Clear existing content
  element.textContent = '';
  
  let index = 0;
  
  const type = () => {
    if (index < text.length) {
      element.textContent += text[index];
      index++;
      setTimeout(type, speed);
    } else if (onComplete) {
      onComplete();
    }
  };
  
  type();
}

/**
 * Clear typewriter effect
 * @param {HTMLElement} element - Target element
 */
export function clearTypewriter(element) {
  element.textContent = '';
}

