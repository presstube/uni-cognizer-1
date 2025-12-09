# Quick Start Guide - Circumplex Color System

## Testing the Implementation

### 1. Start the System
```bash
npm start
```

### 2. What to Look For

#### Server Console
After a mind moment is generated, you'll see:
```
Circumplex: valence=0.60, arousal=0.70
Color: primary=#51c17b, secondary=#55ebec, accent=#ffffb2
```

#### Dashboard (http://localhost:3000/dashboard)
Look for the new section after "Circumplex (Emotional State)":

```
┌─────────────────────────────────────────┐
│ Color Triad (Emotional Palette)         │
├─────────────────────────────────────────┤
│ ┌────┐                                  │
│ │████│  Primary                         │
│ │████│  #51c17b                         │
│ └────┘                                  │
│                                         │
│ ┌────┐                                  │
│ │████│  Secondary                       │
│ │████│  #55ebec                         │
│ └────┘                                  │
│                                         │
│ ┌────┐                                  │
│ │████│  Accent                          │
│ │████│  #ffffb2                         │
│ └────┘                                  │
└─────────────────────────────────────────┘
```

### 3. Expected Behavior

**LIVE Mode:**
- ✅ Colors appear immediately when mind moment arrives
- ✅ Colors update with each new mind moment
- ✅ Smooth color transitions based on emotional state

**DREAM Mode:**
- ⚠️ Old moments show "—" (no colors in database yet)
- ✅ New moments generated after this implementation will have colors

---

## Emotional Color Mapping

| Emotion | Valence | Arousal | Colors (Primary, Secondary, Accent) |
|---------|---------|---------|-------------------------------------|
| **Neutral** | 0.0 | 0.0 | Gray, Slate, Silver |
| **Happy** | +0.8 | +0.6 | Green, Cyan, Yellow |
| **Angry** | -0.7 | +0.6 | Dark Red, Coral, Peach |
| **Sad** | -0.5 | -0.5 | Dark Gray, Muted, Gray |
| **Calm** | +0.5 | -0.5 | Blue, Light Blue, White |

Colors smoothly interpolate between these anchor points!

---

## Testing Checklist

- [ ] Start system with `npm start`
- [ ] Trigger mind moment (send percepts)
- [ ] Check console for color log line
- [ ] Open dashboard and verify color section appears
- [ ] Verify three color swatches are visible
- [ ] Verify hex values are displayed
- [ ] Generate multiple moments and watch colors change
- [ ] Verify colors match emotional tone

---

## Troubleshooting

**Colors not showing on dashboard?**
- Check browser console for errors
- Verify WebSocket connection is active
- Refresh the page

**Colors are all gray?**
- Check that circumplex has non-zero values
- Neutral emotions (0,0) will be gray

**Getting errors?**
- Check that `src/circumplex-to-color.js` exists
- Verify imports in `src/real-cog.js` are correct

---

## Next Steps

Once verified working:
1. Add database migration for `color` column
2. Update `saveMindMoment()` to persist colors
3. Write backfill script for historical moments
4. Consider adding color theming to other UI elements

---

See full documentation:
- `docs/CIRCUMPLEX_COLOR_IMPLEMENTATION_COMPLETE.md`
- `docs/CIRCUMPLEX_COLOR_IMPLEMENTATION_PLAN.md`
