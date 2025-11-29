# Temperature Range and Provider Constraints

**Issues**: 
1. Anthropic rejects temperature > 1
2. Temperature 0 should be deterministic but isn't always

## Temperature Ranges by Provider

| Provider | Min | Max | Notes |
|----------|-----|-----|-------|
| Gemini | 0 | 2.0 | Higher values = more creative |
| Anthropic | 0 | 1.0 | Stricter range |
| OpenAI | 0 | 2.0 | Same as Gemini |

## Fixes Applied

### 1. UI Hint Added
```html
<label>Temperature (0-2)</label>
<input type="number" id="llm-temperature" min="0" max="2" step="0.1" value="0.7">
<div class="input-hint">Gemini: 0-2, Anthropic: 0-1</div>
```

### 2. Auto-Clamping on Input
```javascript
function handleTemperatureChange() {
  let temp = parseFloat(llmTemperatureInput.value);
  
  // Clamp temperature based on provider
  if (llmSettings.provider === 'anthropic') {
    temp = Math.max(0, Math.min(1, temp)); // Anthropic: 0-1
  } else if (llmSettings.provider === 'gemini') {
    temp = Math.max(0, Math.min(2, temp)); // Gemini: 0-2
  }
  
  llmSettings.temperature = temp;
  llmTemperatureInput.value = temp; // Update UI to show clamped value
}
```

### 3. Auto-Adjust on Provider Switch
```javascript
// When switching from Gemini (temp=1.5) to Anthropic, auto-clamp to 1.0
if (llmSettings.provider === 'anthropic' && llmSettings.temperature > 1) {
  llmSettings.temperature = 1;
}
```

## Deterministic Temperature (temp=0)

### Why Temperature 0 Might Not Be Perfectly Deterministic:

**LLM behavior**:
- Temperature 0 makes the model always pick the most likely token
- However, other factors can introduce variation:
  - Floating point precision
  - System prompts or instructions
  - Context window differences
  - Model version updates

**Best Practices for Deterministic Output**:
1. Set temperature = 0
2. Set top_p = 0 (if supported)
3. Set top_k = 1 (Gemini only)
4. Use the same exact prompt every time
5. Use the same model version

### Current Settings in UI:
The "Deterministic" preset button sets:
```javascript
{
  temperature: 0.3,  // Not 0! (0 can sometimes cause issues)
  top_p: 0.5,
  top_k: 20
}
```

For TRUE deterministic output, try:
```javascript
{
  temperature: 0,
  top_p: 0,
  top_k: 1
}
```

## Testing

After restarting the server:

1. **Anthropic + temp > 1**: Auto-clamped to 1.0, no error
2. **Switch provider with high temp**: Auto-adjusted
3. **Temperature 0**: Check server logs to see exact values being sent

## Files Modified

1. `web/prompt-editor/personality/index.html` - Added hint
2. `web/prompt-editor/personality/forge.js` - Added clamping logic
3. `web/prompt-editor/personality/style.css` - Added hint styling
4. `src/api/personalities.js` - Added debug logging

## To Apply

Restart server and reload Personality Forge page. Temperature will now auto-clamp based on provider! 🎯

