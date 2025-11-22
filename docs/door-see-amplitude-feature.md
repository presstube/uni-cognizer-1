# Amplitude-Based Background Color Enhancement

**Date**: November 21, 2025  
**Feature**: Dynamic background color based on microphone amplitude  
**Status**: ✅ Implemented

---

## What Was Added

The `/door/see` app now responds to audio amplitude by changing the background color in real-time, creating a more immersive experience.

### Visual Effect
- **Quiet audio** → Darker background (#111)
- **Loud audio** → Lighter background (#333)
- **Smooth transitions** → 50ms CSS transition

---

## Implementation Details

### 1. Amplitude Calculation (RMS)
```javascript
// Calculate Root Mean Square amplitude
let sum = 0;
for (let i = 0; i < inputBuffer.length; i++) {
  sum += inputBuffer[i] * inputBuffer[i];
}
const rms = Math.sqrt(sum / inputBuffer.length);
```

### 2. Normalization (0.0 - 1.0)
```javascript
// Typical RMS is 0-0.3, so we boost it by 3x
const normalizedAmplitude = Math.min(1.0, rms * 3.0);
```

### 3. Color Mapping (#111 - #333)
```javascript
const minBrightness = 0x11; // 17 decimal
const maxBrightness = 0x33; // 51 decimal

const brightness = Math.floor(minBrightness + (normalizedAmp * (maxBrightness - minBrightness)));
const hex = brightness.toString(16).padStart(2, '0');
const color = `#${hex}${hex}${hex}`;

document.body.style.backgroundColor = color;
```

---

## Changes Made

### `/door/see/app.js`
1. **Added state tracking** (line 16):
   ```javascript
   currentAmplitude: 0
   ```

2. **Added amplitude calculation** (lines 68-76):
   - RMS calculation in `onaudioprocess` handler
   - Normalization to 0.0 - 1.0 range
   - Background color update

3. **Added helper function** (lines 183-193):
   ```javascript
   function updateBackgroundFromAmplitude(normalizedAmp) {
     // Maps amplitude to #111 - #333 range
   }
   ```

4. **Updated SigilAndPhrase config** (line 420):
   ```javascript
   backgroundColor: 'transparent'  // Let body bg show through
   ```

### `/door/see/style.css`
1. **Updated body background** (line 8):
   ```css
   background: #111;  /* Start at darkest */
   transition: background-color 0.05s ease-out;  /* Smooth changes */
   ```

---

## Technical Notes

### Why RMS (Root Mean Square)?
- More accurate than peak amplitude
- Represents perceived loudness better
- Less susceptible to spikes

### Why 3x Multiplier?
- Typical speaking voice: RMS ~0.1 - 0.2
- Without boost: Very subtle color changes
- With 3x boost: Better visual range

### Why 50ms Transition?
- Audio processing runs at ~93ms intervals (4096 samples @ 16kHz)
- 50ms feels responsive but not jarring
- Smooths out rapid fluctuations

---

## Testing

### Expected Behavior
```bash
# Start the app
npm run client:local
# Visit: http://localhost:3001/door/see/

# 1. Start listening
# 2. Background starts at #111 (very dark gray)
# 3. Speak quietly → Subtle brightening to ~#1a1a1a
# 4. Speak normally → Moderate brightening to ~#252525
# 5. Speak loudly → Maximum brightening to #333
# 6. Stay silent → Returns to #111
```

### Visual Feedback Test
```bash
# Test amplitude response:
1. Whisper → Background barely changes
2. Normal voice → Background noticeably lighter
3. Shout → Background reaches #333 (brightest)
4. Stop talking → Background fades back to #111
```

---

## Configuration Options

Want to adjust the effect? Modify these values:

### Sensitivity (app.js, line 76)
```javascript
const normalizedAmplitude = Math.min(1.0, rms * 3.0);
//                                              ↑
// Increase for more sensitivity (e.g., 5.0)
// Decrease for less sensitivity (e.g., 2.0)
```

### Brightness Range (app.js, lines 186-187)
```javascript
const minBrightness = 0x11; // Dark end (try 0x00 for black)
const maxBrightness = 0x33; // Light end (try 0x55 for lighter)
```

### Transition Speed (style.css, line 9)
```css
transition: background-color 0.05s ease-out;
/*                            ↑
   Increase for slower (e.g., 0.2s)
   Decrease for faster (e.g., 0.01s)
*/
```

---

## Future Enhancements (Ideas)

- [ ] Color hue based on tone/frequency
- [ ] Pulsing effect on speech detection
- [ ] Fade to black after silence timeout
- [ ] User-configurable color ranges
- [ ] Debug overlay showing current amplitude

---

## Q&A

**Q: Does this affect audio streaming?**  
A: No, amplitude calculation happens in parallel. PCM conversion unchanged.

**Q: Performance impact?**  
A: Minimal. RMS calculation is O(n) and runs on audio thread.

**Q: Can we disable it?**  
A: Yes, comment out line 75 in app.js:
```javascript
// updateBackgroundFromAmplitude(normalizedAmplitude);
```

**Q: Why transparent SigilAndPhrase background?**  
A: So the dynamic body background shows through. Before it was black, blocking the effect.

---

## Summary

✅ **Added**: Real-time amplitude → background color mapping  
✅ **Range**: #111 (quiet) to #333 (loud)  
✅ **Performance**: Negligible overhead  
✅ **UX**: More immersive, responsive experience  

**Ready for testing!** 🎤🎨

