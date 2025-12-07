# Code Review: 60-Second Timing Loop Implementation

**File Reviewed**: `src/consciousness-loop.js`  
**Lines**: 1-1000  
**Date**: 2025-12-07

## Overall Assessment: ⭐⭐⭐⭐☆ (4/5)

The refactor successfully achieved its goal of creating a **rock-solid, predictable 60-second timing system**. The code is much simpler and more maintainable than the previous async/await chain approach. However, there are several areas with cruft, duplication, and opportunities for cleanup.

---

## 🎯 Priority Fixes (Actionable)

### ❗ HIGH PRIORITY - Fix These First

#### Fix 1: Delete Dead Code
**File**: `src/consciousness-loop.js`  
**Lines to DELETE**: 488-500, 866-870

**What to do**:
1. Delete the entire `livePerceptsPhase()` method (lines 488-500)
2. Delete the entire `sleep()` method (lines 866-870)

**Why**: These methods are never called. `livePerceptsPhase()` was replaced by direct setTimeout calls in `liveTick()`. `sleep()` was only used by the old async methods.

#### Fix 2: Add Missing Constructor Properties  
**File**: `src/consciousness-loop.js`  
**Line**: After line 63 (after `this.phaseTimeouts = []`)

**What to do**: Add these two lines:
```javascript
// Dream cycle cache (for fast random selection)
this.dreamCycleCache = [];
this.dreamCacheInitialized = false;
```

**Why**: These properties are used throughout the code but never initialized in the constructor.

#### Fix 3: Fix Dream Buffer Race Condition
**File**: `src/consciousness-loop.js`  
**Lines to REPLACE**: 256-268

**OLD CODE** (lines 256-268):
```javascript
// Get dream from buffer (or use fallback)
const dream = this.dreamBuffer.current || this.dreamBuffer.next;

if (!dream) {
  console.warn('⚠️  No dream available in buffer!');
  return;
}

console.log(`💭 Cycle starting: ${dream.cycle} "${dream.sigilPhrase}"`);

// Rotate buffer: current dream is done, next becomes current
this.dreamBuffer.current = this.dreamBuffer.next;
this.dreamBuffer.next = null;
```

**NEW CODE**:
```javascript
// Get dream from buffer (or use fallback)
const dream = this.dreamBuffer.current || this.dreamBuffer.next;

if (!dream) {
  console.warn('⚠️  No dream available in buffer!');
  return;
}

console.log(`💭 Cycle starting: ${dream.cycle} "${dream.sigilPhrase}"`);

// Rotate buffer: current dream is done, next becomes current
// Only rotate if we have a next dream ready
if (this.dreamBuffer.next) {
  this.dreamBuffer.current = this.dreamBuffer.next;
  this.dreamBuffer.next = null;
}
// Otherwise keep current and hope next cycle has next ready
```

**Why**: Without this check, if the background loader is slow, `next` could be null, causing the same dream to play twice.

---

### ⚠️ MEDIUM PRIORITY - Fix When Convenient

#### Fix 4: Store and Cleanup Dream Loader Interval
**File**: `src/consciousness-loop.js`  

**Step 1**: Add to constructor (after line 63):
```javascript
this.dreamLoaderInterval = null;
```

**Step 2**: Replace `startDreamLoader()` method (lines 373-386):
```javascript
startDreamLoader() {
  if (this.dreamLoaderInterval) return; // Already running
  
  // Check buffer every 5 seconds
  this.dreamLoaderInterval = setInterval(() => {
    if (this.mode !== 'DREAM' || !this.intervalId) {
      clearInterval(this.dreamLoaderInterval);
      this.dreamLoaderInterval = null;
      return;
    }
    
    // If next slot is empty and not currently loading, load one
    if (!this.dreamBuffer.next && !this.dreamBuffer.loading) {
      this.loadNextDream();
    }
  }, 5000);
}
```

**Step 3**: Add to `stop()` method (after line 206):
```javascript
// Clear dream loader interval
if (this.dreamLoaderInterval) {
  clearInterval(this.dreamLoaderInterval);
  this.dreamLoaderInterval = null;
}
```

**Why**: Prevents potential memory leak if mode switches multiple times.

#### Fix 5: Use Fast Cache for Placeholder Loading
**File**: `src/consciousness-loop.js`  
**Lines to REPLACE**: 107-190

This is complex - the placeholder loading should use the same fast cache approach as `recallMoment()`. Currently it uses slow `ORDER BY RANDOM()`.

**Recommendation**: Defer this fix until after the DRY refactor (Fix 6) so you can reuse the shared fetching logic.

#### Fix 6: DRY Up Database Fetching (Large Refactor)
**File**: `src/consciousness-loop.js`  
**Lines affected**: 573-680, 910-997

**Problem**: `recallMoment()` and `recallMomentSlow()` have ~120 lines of duplicated code (SDF conversion, PNG conversion, prior moments fetching, normalization).

**Solution**: Extract shared logic into helper method. This is a larger refactor.

**Recommendation**: Consider this a "nice to have" unless you're doing significant work in this file. The duplication works, it's just not elegant.

---

### 💡 LOW PRIORITY - Polish

#### Fix 7: Pre-calculate Phase Offsets
**File**: `src/consciousness-loop.js`  
**Line**: After line 32 (after PRIOR_CONTEXT_DEPTH)

**What to do**: Add these constants:
```javascript
// Phase offsets (for setTimeout scheduling)
const SPOOL_OFFSET_MS = PERCEPTS_PHASE_MS;
const SIGILIN_OFFSET_MS = PERCEPTS_PHASE_MS + SPOOL_PHASE_MS;
const SIGILHOLD_OFFSET_MS = SIGILIN_OFFSET_MS + SIGILIN_PHASE_MS;
const SIGILOUT_OFFSET_MS = SIGILHOLD_OFFSET_MS + SIGILHOLD_PHASE_MS;
const RESET_OFFSET_MS = SIGILOUT_OFFSET_MS + SIGILOUT_PHASE_MS;
```

Then replace all the manual calculations in `dreamTick()` and `liveTick()` with these constants.

**Why**: Makes phase scheduling more maintainable and less error-prone.

#### Fix 8: Improve Comment at Line 515
**File**: `src/consciousness-loop.js`  
**Line to REPLACE**: 515-516

**OLD**:
```javascript
// Call existing cognize() function
// Note: Results come via setupLiveListeners() callbacks
```

**NEW**:
```javascript
// Fire-and-forget: cognize() triggers LLM calls that emit events
// Results captured by setupLiveListeners() and stored in cycleBuffer.ready
// They'll be displayed in the NEXT cycle (interleaved A/B pattern)
```

**Why**: Clearer explanation of the interleaved timing architecture.

#### Fix 9: Improve Sort Error Handling
**File**: `src/consciousness-loop.js`  
**Lines to REPLACE**: 330-338

**OLD**:
```javascript
// Sort chronologically
try {
  allPercepts.sort((a, b) => 
    new Date(a.timestamp) - new Date(b.timestamp)
  );
} catch (error) {
  console.error('⚠️  Failed to sort percepts:', error.message);
  return;
}
```

**NEW**:
```javascript
// Sort chronologically (graceful fallback if timestamps invalid)
try {
  allPercepts.sort((a, b) => 
    new Date(a.timestamp) - new Date(b.timestamp)
  );
} catch (error) {
  console.warn('⚠️  Failed to sort percepts, using arrival order:', error.message);
  // Continue with unsorted percepts - still usable
}
```

**Why**: Makes error handling consistent with other graceful degradations in the code.

---

## 🟢 Excellent Decisions (Keep These!)

### 1. **Pure Timing Separation**
```javascript
// Lines 251-310, 419-485
dreamTick() / liveTick()
```
✅ **GREAT**: Timing is completely decoupled from data loading  
✅ **GREAT**: All phases scheduled with fixed `setTimeout` offsets  
✅ **GREAT**: No async/await in tick methods  
✅ **GREAT**: Easy to reason about - phases ALWAYS fire at exact times

### 2. **Consolidated Timing Constants**
```javascript
// Lines 16-33
const PERCEPTS_PHASE_MS = 35000;
const CYCLE_MS = PERCEPTS_PHASE_MS + SPOOL_PHASE_MS + ...;
```
✅ **GREAT**: All timing in one place  
✅ **GREAT**: CYCLE_MS calculated from phases (single source of truth)  
✅ **GREAT**: No ENV vars (eliminated configuration drift)

### 3. **Clean Buffer System for DREAM Mode**
```javascript
// Lines 55-60
this.dreamBuffer = {
  current: null,
  next: null,
  loading: false
};
```
✅ **GREAT**: Simple, clear purpose  
✅ **GREAT**: Background loader keeps it filled  
✅ **GREAT**: No complex state management

---

## 📊 Statistics

### Lines of Code
- Total: 1000 lines
- Dead code: ~25 lines (2.5%)
- Duplicated code: ~120 lines (12%)

### Method Count
- Public methods: 15
- Private helpers: 8
- Unused methods: 2 (`livePerceptsPhase`, `sleep`)

### Async Methods
- Start: 2 (start, switchMode - necessary)
- DB operations: 6 (all necessary)
- Tick methods: 0 ✅ (perfect!)

---

## 🏆 Overall: Strong Implementation

Despite the issues, this is a **major improvement** over the previous system:
- ✅ Timing is rock-solid
- ✅ Easy to reason about
- ✅ No async timing dependencies
- ✅ Performance is excellent

The cruft is mostly from incomplete cleanup during the refactor, not fundamental design issues. A quick cleanup pass would make this code **production-excellent**.

---

## 📋 Checklist for Next Agent

Use this checklist to implement the fixes:

### High Priority (Do Now)
- [ ] Fix 1: Delete `livePerceptsPhase()` method (lines 488-500)
- [ ] Fix 1: Delete `sleep()` method (lines 866-870)
- [ ] Fix 2: Add `dreamCycleCache` and `dreamCacheInitialized` to constructor
- [ ] Fix 3: Add null check to dream buffer rotation (lines 256-268)

### Medium Priority (Do Soon)
- [ ] Fix 4: Add `dreamLoaderInterval` to constructor
- [ ] Fix 4: Update `startDreamLoader()` to store interval ID
- [ ] Fix 4: Add cleanup to `stop()` method

### Low Priority (Polish)
- [ ] Fix 7: Add phase offset constants
- [ ] Fix 8: Improve comment at line 515
- [ ] Fix 9: Improve sort error handling

### Future Work (Nice to Have)
- [ ] Fix 5: Use fast cache for placeholder loading
- [ ] Fix 6: Extract shared DB fetching logic (DRY)

**After completing High Priority fixes, run tests to ensure DREAM and LIVE modes still work correctly.**


### 1. **Pure Timing Separation**
```javascript
// Lines 251-310, 419-485
dreamTick() / liveTick()
```
✅ **GREAT**: Timing is completely decoupled from data loading
✅ **GREAT**: All phases scheduled with fixed `setTimeout` offsets
✅ **GREAT**: No async/await in tick methods
✅ **GREAT**: Easy to reason about - phases ALWAYS fire at exact times

### 2. **Consolidated Timing Constants**
```javascript
// Lines 16-33
const PERCEPTS_PHASE_MS = 35000;
const CYCLE_MS = PERCEPTS_PHASE_MS + SPOOL_PHASE_MS + ...;
```
✅ **GREAT**: All timing in one place
✅ **GREAT**: CYCLE_MS calculated from phases (single source of truth)
✅ **GREAT**: No ENV vars (eliminated configuration drift)

### 3. **Clean Buffer System for DREAM Mode**
```javascript
// Lines 55-60
this.dreamBuffer = {
  current: null,
  next: null,
  loading: false
};
```
✅ **GREAT**: Simple, clear purpose
✅ **GREAT**: Background loader keeps it filled
✅ **GREAT**: No complex state management

---

## 🟡 Issues Found

### 1. **Dead Code: `livePerceptsPhase()` Method**

**Lines 488-500**: This method is NEVER CALLED

```javascript
async livePerceptsPhase(globalCycle) {  // ❌ UNUSED
  this.emitPhase('PERCEPTS', PERCEPTS_PHASE_MS, globalCycle, false);
  console.log(`  🧠 PERCEPTS phase (${PERCEPTS_PHASE_MS/1000}s) - accumulating`);
  await this.sleep(PERCEPTS_PHASE_MS);
  console.log(`  🧠 PERCEPTS phase complete`);
}
```

**Problem**: This is leftover from the old async approach. The new `liveTick()` directly schedules phases with `setTimeout` (lines 440-444), so this method is completely unused.

**Fix**: Delete lines 488-500

---

### 2. **Missing Declaration: `dreamCycleCache`**

**Line 554**: References `this.dreamCycleCache` but it's never declared in constructor

```javascript
// Line 554
this.dreamCycleCache = result.rows.map(row => row.cycle);
```

**Problem**: `dreamCycleCache` and `dreamCacheInitialized` are used but never initialized in the constructor. They work because JavaScript allows dynamic properties, but it's sloppy.

**Fix**: Add to constructor (after line 63):
```javascript
// Dream cycle cache (for fast random selection)
this.dreamCycleCache = [];
this.dreamCacheInitialized = false;
```

---

### 3. **Code Duplication: Phase Offset Calculation**

**Lines 279-309 and 454-484**: Same calculation pattern repeated

```javascript
// DREAM mode (line 283)
}, PERCEPTS_PHASE_MS));

// DREAM mode (line 290)
}, PERCEPTS_PHASE_MS + SPOOL_PHASE_MS));

// LIVE mode (line 458) 
}, PERCEPTS_PHASE_MS));

// LIVE mode (line 465)
}, PERCEPTS_PHASE_MS + SPOOL_PHASE_MS));
```

**Problem**: Brittle - if you change phase order, you have to manually update all offset calculations in multiple places.

**Better Approach**: Pre-calculate offsets as constants:
```javascript
const SPOOL_OFFSET_MS = PERCEPTS_PHASE_MS;
const SIGILIN_OFFSET_MS = PERCEPTS_PHASE_MS + SPOOL_PHASE_MS;
const SIGILHOLD_OFFSET_MS = SIGILIN_OFFSET_MS + SIGILIN_PHASE_MS;
const SIGILOUT_OFFSET_MS = SIGILHOLD_OFFSET_MS + SIGILHOLD_PHASE_MS;
const RESET_OFFSET_MS = SIGILOUT_OFFSET_MS + SIGILOUT_PHASE_MS;
```

---

### 4. **Massive Code Duplication: `recallMoment()` vs `recallMomentSlow()`**

**Lines 573-680 and 910-997**: 90% identical code

Both methods:
- Query the database
- Convert SDF buffer
- Convert PNG buffer  
- Fetch prior moments
- Call `normalizeMindMoment()`

**Only Difference**: Lines 597-607 vs 913-930 (the main query)

**Problem**: Violates DRY principle. Any bug fix or enhancement needs to be applied twice.

**Better Approach**: Extract shared logic:
```javascript
async fetchMomentByQuery(query, params) {
  const result = await pool.query(query, params);
  if (result.rows.length === 0) return null;
  
  // All the shared conversion and normalization logic...
  return normalizedMoment;
}

async recallMoment() {
  // Use cache
  const cycle = this.dreamCycleCache[randomIndex];
  return await this.fetchMomentByQuery(
    'SELECT * FROM mind_moments WHERE cycle = $1',
    [cycle]
  );
}

async recallMomentSlow() {
  // Use ORDER BY RANDOM()
  return await this.fetchMomentByQuery(
    'SELECT * FROM mind_moments WHERE ... ORDER BY RANDOM() LIMIT 1',
    []
  );
}
```

---

### 5. **Inconsistent Error Handling**

**Lines 336-337**: Silently returns on sort error
```javascript
} catch (error) {
  console.error('⚠️  Failed to sort percepts:', error.message);
  return;  // ❌ Silently fails - percepts never emitted
}
```

**Lines 656, 975**: Continues without prior moments
```javascript
} catch (error) {
  console.error('💭 Failed to fetch prior moments:', error.message);
  // Continue without prior moments  // ✅ Good - graceful degradation
}
```

**Problem**: Inconsistent strategy. Sorting failure is catastrophic (no percepts shown), but prior moments failure is graceful.

**Better**: Make sort failure graceful too:
```javascript
try {
  allPercepts.sort(...);
} catch (error) {
  console.warn('⚠️  Failed to sort percepts, using as-is:', error.message);
  // Continue with unsorted percepts
}
```

---

### 6. **Console Logging Inconsistency**

**Lines 512, 523**: Extra indentation for LLM logs
```javascript
console.log(`  🧠 [Cycle ${predictedCycle}] LLM pipeline starting...`);
console.log(`  ✅ [Cycle ${actualCycle}] Complete (${duration}s)`);
```

But lines 275, 282, 288 use same indentation:
```javascript
console.log(`  💭 PERCEPTS (${PERCEPTS_PHASE_MS/1000}s)`);
console.log(`  💭 SPOOL (${SPOOL_PHASE_MS/1000}s)`);
```

**Problem**: `startBackgroundCognition()` logs should be further indented since they're nested within a phase.

**Fix**: Use 3 or 4 spaces for LLM logs:
```javascript
console.log(`     [Cycle ${predictedCycle}] LLM pipeline starting...`);
```

---

### 7. **Misleading Comment**

**Line 515**: Says "Results come via setupLiveListeners() callbacks"
```javascript
// Note: Results come via setupLiveListeners() callbacks
await cognize(percepts.visual, percepts.audio, PRIOR_CONTEXT_DEPTH);
```

**Problem**: This is technically true, but the comment should explain WHY we're not awaiting/using the results directly.

**Better Comment**:
```javascript
// Fire-and-forget: cognize() triggers LLM calls that emit events
// Results captured by setupLiveListeners() and stored in cycleBuffer.ready
// They'll be displayed in the NEXT cycle (interleaved A/B pattern)
await cognize(percepts.visual, percepts.audio, PRIOR_CONTEXT_DEPTH);
```

---

### 8. **Unused `sleep()` Method**

**Lines 866-870**: This helper exists but is NEVER USED in the new code

```javascript
sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

**Problem**: Leftover from async phase methods. The old `livePerceptsPhase()` (also unused) was the only caller.

**Fix**: Delete along with `livePerceptsPhase()`

---

### 9. **Missing Cache Invalidation**

**Line 567**: `refreshDreamCache()` exists but is never called anywhere

```javascript
async refreshDreamCache() {
  await this.initializeDreamCache();
}
```

**Problem**: If new mind moments are added to the DB while system is running, they won't appear in dreams until restart.

**Better**: Either:
1. Call `refreshDreamCache()` periodically in `startDreamLoader()`, OR
2. Remove the method if we don't need it, OR
3. Document that it's intended for future use

---

### 10. **Potential Memory Leak: `startDreamLoader()`**

**Lines 373-386**: `setInterval` is never stored or cleaned up

```javascript
startDreamLoader() {
  const loaderInterval = setInterval(() => {
    if (this.mode !== 'DREAM' || !this.intervalId) {
      clearInterval(loaderInterval);  // Self-cleaning
      return;
    }
    // ...
  }, 5000);
}
```

**Problem**: If `switchMode('DREAM')` is called multiple times, multiple intervals will be created and only self-clean when mode switches. Not critical but not ideal.

**Better**: Store the interval ID and clear it in `stop()`:
```javascript
constructor() {
  this.dreamLoaderInterval = null;
}

startDreamLoader() {
  if (this.dreamLoaderInterval) return; // Already running
  this.dreamLoaderInterval = setInterval(() => { ... }, 5000);
}

stop() {
  if (this.dreamLoaderInterval) {
    clearInterval(this.dreamLoaderInterval);
    this.dreamLoaderInterval = null;
  }
}
```

---

## 🔴 Potential Bugs

### 1. **Race Condition: Dream Buffer Rotation**

**Lines 266-268**: Buffer rotation happens BEFORE phases start

```javascript
// Rotate buffer: current dream is done, next becomes current
this.dreamBuffer.current = this.dreamBuffer.next;
this.dreamBuffer.next = null;
```

**Problem**: If `loadNextDream()` is slow or fails, `dreamBuffer.next` will be null for the entire next cycle.

**Scenario**:
1. Cycle N starts, uses `dreamBuffer.current` (cycle 100)
2. Immediately rotates: `current = next` (cycle 200), `next = null`
3. Background loader tries to fill `next` but DB is slow
4. Cycle N+1 starts 60s later, `dreamBuffer.next` is still null
5. Line 257 falls back to `dreamBuffer.current` (cycle 200) again
6. Same dream plays twice!

**Better**: Check if buffer is full before rotating, or handle null case explicitly:
```javascript
const dream = this.dreamBuffer.current || this.dreamBuffer.next;
if (!dream) {
  console.error('⚠️  No dream in buffer! Skipping cycle.');
  return;
}

// Only rotate if we have a next dream ready
if (this.dreamBuffer.next) {
  this.dreamBuffer.current = this.dreamBuffer.next;
  this.dreamBuffer.next = null;
}
// Otherwise keep current and hope next cycle has next ready
```

---

### 2. **Placeholder Loading Uses Slow Query**

**Lines 112-123**: `loadPlaceholder()` uses `ORDER BY RANDOM()`

```javascript
const result = await pool.query(`
  SELECT ... FROM mind_moments
  WHERE sigil_code IS NOT NULL AND cycle >= 48
  ORDER BY RANDOM()  // ❌ Slow!
  LIMIT 1
`);
```

**Problem**: We implemented the fast cache-based system for `recallMoment()`, but forgot to use it for `loadPlaceholder()`. Startup could be 2-5s slower than necessary.

**Fix**: Use the same fast approach:
```javascript
async loadPlaceholder() {
  // Initialize cache first
  await this.initializeDreamCache();
  
  // Pick random from cache
  if (this.dreamCycleCache.length > 0) {
    const randomIndex = Math.floor(Math.random() * this.dreamCycleCache.length);
    const selectedCycle = this.dreamCycleCache[randomIndex];
    
    // Load that specific cycle
    const moment = await this.fetchMomentByCycle(selectedCycle);
    if (moment) {
      this.cycleBuffer.placeholder = { ...moment, cycle: 0, isPlaceholder: true };
      return;
    }
  }
  
  // Fallback to hardcoded...
}
```

---

## 📊 Statistics

### Lines of Code
- Total: 1000 lines
- Dead code: ~25 lines (2.5%)
- Duplicated code: ~120 lines (12%)

### Method Count
- Public methods: 15
- Private helpers: 8
- Unused methods: 2 (`livePerceptsPhase`, potentially `sleep`)

### Async Methods
- Start: 1 (start, switchMode - necessary)
- DB operations: 6 (all necessary)
- Tick methods: 0 ✅ (perfect!)

---

## 🎯 Priority Fixes

### High Priority (Do Now)
1. ❗ Delete dead code: `livePerceptsPhase()` and `sleep()` methods
2. ❗ Add missing constructor properties: `dreamCycleCache`, `dreamCacheInitialized`
3. ❗ Fix dream buffer rotation race condition (lines 266-268)

### Medium Priority (Do Soon)
4. ⚠️ Extract shared DB fetching logic (DRY up `recallMoment` / `recallMomentSlow`)
5. ⚠️ Fix placeholder loading to use fast cache (lines 112-123)
6. ⚠️ Store and cleanup `dreamLoaderInterval` properly

### Low Priority (Nice to Have)
7. 💡 Pre-calculate phase offsets as constants
8. 💡 Improve error handling consistency
9. 💡 Update misleading comments
10. 💡 Consider calling `refreshDreamCache()` periodically or document why not

---

## 🏆 Overall: Strong Implementation

Despite the issues, this is a **major improvement** over the previous system:
- ✅ Timing is rock-solid
- ✅ Easy to reason about
- ✅ No async timing dependencies
- ✅ Performance is excellent

The cruft is mostly from incomplete cleanup during the refactor, not fundamental design issues. A quick cleanup pass would make this code **production-excellent**.

**Recommendation**: Clean up the high-priority items (dead code, missing declarations, race condition) before considering this refactor "done".
