/**
 * Gemini Live WebSocket Response Handler
 * Handles streaming JSON responses with graceful error recovery
 */

export function createGeminiLiveHandler(callbacks = {}) {
  const {
    onSetupComplete = () => {},
    onPartialText = () => {},
    onTurnComplete = () => {},
    onValidJSON = () => {},
    onInvalidJSON = () => {}
  } = callbacks;

  let buffer = '';

  function sanitizeJSON(text) {
    let clean = text.trim();
    
    // Strip markdown code fences
    if (clean.startsWith('```')) {
      clean = clean.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '');
    }
    
    // Strip common control characters that break JSON.parse
    // (newlines, tabs, etc. inside unescaped strings)
    clean = clean.replace(/[\u0000-\u001F]+/g, ' ');
    
    return clean;
  }

  return function handleResponse(message) {
    // 1. Setup acknowledgment
    if (message.setupComplete) {
      console.log('✅ Setup complete, ready to stream audio');
      onSetupComplete();
      return;
    }

    // 2. Skip non-content messages
    if (!message.serverContent) return;

    const content = message.serverContent;

    // 3. Accumulate streaming text parts
    if (content.modelTurn && content.modelTurn.parts) {
      for (const part of content.modelTurn.parts) {
        if (part.text) {
          buffer += part.text;
          onPartialText(buffer, part.text);
        }
      }
    }

    // 4. Process complete turn
    if (content.turnComplete) {
      console.log('✅ Turn complete');
      onTurnComplete(buffer);

      try {
        const cleaned = sanitizeJSON(buffer);
        const json = JSON.parse(cleaned);
        
        console.log('✅ Parsed JSON response:', json);
        onValidJSON(json);
        
      } catch (error) {
        console.error('❌ JSON parse failed:', error.message);
        console.log('Raw response:', buffer);
        onInvalidJSON(error, buffer);
        
      } finally {
        // CRITICAL: Always clear buffer so next turn starts fresh
        buffer = '';
      }
    }
  };
}

