# Sigil Integration Plan

**Goal**: Integrate sigil generation as an internal cognitive process in Cognizer-1

**Date**: 2025-11-07

---

## Overview

Transform the cognitive loop to generate complete thought artifacts:
- Mind moment (text observation)
- Sigil phrase (essence distillation)
- Sigil code (visual representation)

Each cognitive cycle produces a complete, atomic history item with all three components.

---

## Current Flow

```
Cognitive Cycle (5s interval)
└─ cognize(visualPercepts, audioPercepts, depth=3)
   ├─ Create history item (awaiting)
   ├─ Call LLM for mind moment
   ├─ Receive: { mindMoment, sigilPhrase }
   ├─ Update history item
   └─ Emit 'mindMoment' event
```

## Target Flow

```
Cognitive Cycle (5s interval)
└─ cognize(visualPercepts, audioPercepts, depth=3)
   ├─ Create history item (awaiting all fields)
   ├─ STEP 1: Call LLM for mind moment
   │  ├─ Receive: { mindMoment, sigilPhrase }
   │  ├─ Update history: mindMoment, sigilPhrase
   │  └─ Emit 'mindMoment' event (early notification)
   ├─ STEP 2: Generate sigil (if sigilPhrase exists)
   │  ├─ Call generateSigil(sigilPhrase)
   │  ├─ Receive: sigilCode
   │  ├─ Update history: sigilCode
   │  └─ Emit 'sigil' event
   └─ Emit 'cycleCompleted' event (with all data)
```

---

## Architecture

### New Directory Structure

```
cognizer-1/
├── assets/                         # NEW
│   └── sigil-grid-original.png    # Copy from sigil-server
├── src/
│   ├── main.js                    # Update: pass sigil callback
│   ├── real-cog.js                # Update: add sigil generation step
│   ├── fake-cog.js                # Update: mock sigil generation
│   ├── session-manager.js         # No change
│   ├── personality-uni-v2.js      # No change
│   ├── providers/                 # No change
│   │   ├── anthropic.js
│   │   ├── gemini.js
│   │   ├── openai.js
│   │   └── index.js
│   └── sigil/                     # NEW MODULE
│       ├── generator.js           # Main sigil generation logic
│       ├── prompt.js              # Prompt builder
│       └── image.js               # Reference image handler
├── server.js                      # Update: wire up sigil listener
├── package.json                   # No new dependencies needed
└── docs/
    └── sigil-integration-plan.md  # This file
```

---

## Implementation Steps

### Phase 1: Setup Sigil Module (30 min)

**1.1 Create Directory Structure**
- [ ] Create `src/sigil/` directory
- [ ] Create `assets/` directory

**1.2 Copy Reference Image**
- [ ] Copy `sigil-grid-original.png` from sigil-server to `assets/`
- [ ] Verify image exists and is readable

**1.3 Create `src/sigil/image.js`**
- [ ] Implement `loadReferenceImage()` - loads and caches base64 image
- [ ] Implement `getImageContent()` - returns cached content
- [ ] Test: Verify image loads at startup

**1.4 Create `src/sigil/prompt.js`**
- [ ] Implement `buildPrompt(concept)` - formats sigil generation prompt
- [ ] Port prompt rules from sigil-server
- [ ] Test: Verify prompt formatting

**1.5 Create `src/sigil/generator.js`**
- [ ] Import Anthropic SDK (already in dependencies)
- [ ] Implement `generateSigil(concept)` function
- [ ] Use official Anthropic SDK (not fetch)
- [ ] Include reference image in request
- [ ] Return canvas drawing code
- [ ] Test: Generate a test sigil

---

### Phase 2: Update Cognitive Pipeline (45 min)

**2.1 Update `src/real-cog.js`**

- [ ] Import `generateSigil` from `./sigil/generator.js`
- [ ] Add `sigilListeners = []` array
- [ ] Add `sigilCode: "awaiting"` to history initialization
- [ ] Update `cognize()` flow:
  - [ ] After receiving mind moment, emit `mindMoment` event (early)
  - [ ] Call `generateSigil(sigilPhrase)` if phrase exists
  - [ ] Update history with `sigilCode`
  - [ ] Emit `sigil` event with cycle, code, phrase
  - [ ] Handle sigil generation errors gracefully
  - [ ] Update `cycleCompleted` to include `sigilCode`
- [ ] Implement `dispatchSigil(cycle, sigilCode, sigilPhrase)`
- [ ] Export `onSigil(listener)` function
- [ ] Update `clearListeners()` to clear `sigilListeners`
- [ ] Update logging to show sigil generation status

**2.2 Update `src/fake-cog.js`**

- [ ] Add `sigilCode` to mock history
- [ ] Generate mock sigil code (simple canvas commands)
- [ ] Add `sigilListeners` array
- [ ] Export `onSigil(listener)` function
- [ ] Update `clearListeners()`

**2.3 Update `src/main.js`**

- [ ] Import `onSigil` from `./real-cog.js`
- [ ] Add `sigilCallback` parameter to `startCognitiveLoop()`
- [ ] Register sigil callback with `onSigil(sigilCallback)`
- [ ] Update function signature in JSDoc

---

### Phase 3: Update Server Integration (30 min)

**3.1 Update `server.js`**

- [ ] Add sigil callback to `startCognitiveLoop()` call
- [ ] Emit WebSocket event `'sigil'` with:
  ```javascript
  {
    cycle: number,
    sigilCode: string,
    sigilPhrase: string,
    timestamp: ISO string
  }
  ```
- [ ] Update `cycleCompleted` emission to include `sigilCode`
- [ ] Add startup log for sigil image status
- [ ] Document new WebSocket event in comments

**3.2 Update README.md**

- [ ] Document new `sigil` WebSocket event
- [ ] Update cognitive flow diagram
- [ ] Add sigil generation to architecture section
- [ ] Update history structure documentation
- [ ] Note timing: ~3-5s total per cycle

---

### Phase 4: Testing (45 min)

**4.1 Unit Testing**

- [ ] Test `loadReferenceImage()` - verify loads without error
- [ ] Test `buildPrompt()` - verify prompt format
- [ ] Test `generateSigil()` - verify returns valid code
- [ ] Test with missing image - verify graceful degradation

**4.2 Integration Testing**

- [ ] Test fake cognitive loop with mock sigil
  ```bash
  npm run test-fake
  ```
- [ ] Verify console output shows sigil generation
- [ ] Verify history contains sigilCode

**4.3 Real LLM Testing**

- [ ] Start dev server:
  ```bash
  npm run dev:full
  ```
- [ ] Open `http://localhost:8080/host/`
- [ ] Start session and send percepts
- [ ] Verify WebSocket events arrive in order:
  1. `cycleStarted`
  2. `mindMoment` (with sigilPhrase)
  3. `sigil` (with sigilCode)
  4. `cycleCompleted` (with all data)
- [ ] Verify timing stays within 5s cycle
- [ ] Test error handling: invalid API key
- [ ] Test edge case: no sigilPhrase returned

**4.4 Client Integration Testing**

- [ ] Update `host2/index.html` to listen for `sigil` event
- [ ] Display sigil code in UI (collapsible)
- [ ] (Optional) Render sigil on canvas element
- [ ] Test with multiple consecutive cycles

---

### Phase 5: Documentation & Cleanup (30 min)

**5.1 Update Documentation**

- [ ] Update `README.md` with new architecture
- [ ] Create/update API reference for new event
- [ ] Update `AGGREGATOR_INTEGRATION.md` with sigil event
- [ ] Document history structure with sigilCode field

**5.2 Code Quality**

- [ ] Run linter on new files
- [ ] Ensure all files < 80 lines (per prime directive)
- [ ] Add JSDoc comments to public functions
- [ ] Verify functional style (no classes except SessionManager)

**5.3 Environment Variables**

- [ ] Document: No new env vars needed (uses existing ANTHROPIC_API_KEY)
- [ ] Verify `.env.example` is up to date

---

## Error Handling Strategy

### Sigil Generation Failure

If sigil generation fails:
1. Log error to console
2. Set `sigilCode: null` in history
3. Emit `sigilFailed` state event (optional)
4. Still emit `cycleCompleted` (cycle continues)
5. Don't crash the cognitive loop

### Missing Reference Image

If reference image missing:
1. Log warning at startup
2. Generate sigils without reference (degraded quality)
3. Continue operating normally

### Timeout Handling

- Mind moment: Uses existing LLM timeout (30s default)
- Sigil generation: Uses Anthropic SDK timeout (30s default)
- Total max: ~60s worst case (won't block 5s cycle, runs async)

---

## WebSocket Event Reference

### New Event: `sigil`

**Direction**: Server → Client

**Payload**:
```javascript
{
  cycle: 42,
  sigilCode: "ctx.beginPath();\nctx.moveTo(50, 20);\n...",
  sigilPhrase: "Threshold of Wonder",
  timestamp: "2025-11-07T10:30:06.500Z"
}
```

**Timing**: Emitted ~2-3s after `mindMoment` event

**Example**:
```javascript
socket.on('sigil', ({ cycle, sigilCode, sigilPhrase }) => {
  console.log(`Sigil ${cycle}: "${sigilPhrase}"`);
  // Render sigilCode on canvas...
});
```

### Updated Event: `cycleCompleted`

**Added Fields**:
```javascript
{
  cycle: 42,
  mindMoment: "...",
  sigilPhrase: "...",
  sigilCode: "ctx.beginPath()...", // NEW
  duration: 4200,
  timestamp: "2025-11-07T10:30:06.500Z"
}
```

---

## Timing Analysis

### Current Cycle Time
- LLM call: ~1-2s
- **Total**: ~1-2s

### New Cycle Time
- LLM call (mind moment): ~1-2s
- Sigil generation: ~2-3s
- **Total**: ~3-5s

**Assessment**: Still within 5s heartbeat cycle ✅

---

## Cost Analysis

### API Calls Per Cycle

**Before**:
- 1 LLM call (mind moment)

**After**:
- 1 LLM call (mind moment) - existing
- 1 LLM call (sigil) - NEW

**Cost Impact**:
- 2x API calls per cycle
- Both use Claude Sonnet 4
- Sigil calls are smaller (max 1024 tokens)
- Estimated: ~$0.01-0.02 per cycle
- At 1 cycle/5s: ~$1-2 per hour of continuous operation

**Mitigation**:
- Session timeout (60s) limits cost
- Only active when visitors present
- Can disable sigil generation via feature flag if needed

---

## Future Enhancements

### Phase 6 (Future)

- [ ] Add feature flag: `ENABLE_SIGIL_GENERATION=true|false`
- [ ] Cache sigils by phrase (reduce duplicate generations)
- [ ] Add sigil rendering to test client
- [ ] Store sigils in persistent database
- [ ] Add sigil gallery endpoint
- [ ] Support alternative sigil styles
- [ ] Add sigil generation metrics/monitoring

---

## Rollback Plan

If integration causes issues:

1. **Quick Rollback**: Comment out sigil generation step in `real-cog.js`
2. **Full Rollback**: `git revert` to pre-integration commit
3. **Partial Rollback**: Keep module but disable via feature flag

---

## Success Criteria

- [ ] Cognitive loop generates complete artifacts (moment + phrase + code)
- [ ] History items contain all three components
- [ ] WebSocket emits both `mindMoment` and `sigil` events
- [ ] Timing stays within 5s cycle
- [ ] Error handling is graceful (no crashes)
- [ ] Code follows prime directive (functional, <80 lines, immutable)
- [ ] Tests pass (fake and real)
- [ ] Documentation is updated
- [ ] Production deployment successful

---

## Dependencies

### No New Packages Required ✅

- Anthropic SDK: Already in `package.json`
- Express/CORS: Not needed (WebSocket only)
- All Node.js built-ins: `fs`, `path`

---

## Timeline

- **Phase 1** (Setup): 30 min
- **Phase 2** (Pipeline): 45 min
- **Phase 3** (Server): 30 min
- **Phase 4** (Testing): 45 min
- **Phase 5** (Docs): 30 min

**Total**: ~3 hours

---

## Notes

- Sigil server remains independent (can be deployed separately if needed)
- This integration is for internal cognitive process only
- External clients cannot directly request sigils
- All sigil generation happens through cognitive cycle
- Maintains functional programming style per prime directive

---

## Approval Checklist

Before starting implementation:
- [ ] Review architecture with team
- [ ] Confirm API cost acceptable
- [ ] Verify timing acceptable (~3-5s per cycle)
- [ ] Confirm no new dependencies needed
- [ ] Review error handling strategy

---

**Status**: READY FOR IMPLEMENTATION

**Next Step**: Begin Phase 1 - Setup Sigil Module

