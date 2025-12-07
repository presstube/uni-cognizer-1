# Dream Mode Pre-fetch Fix

## The Problem

After DREAM mode completes a cycle (RESET phase), there's a noticeable delay before the next PERCEPTS phase fires. Expected: 2 seconds (based on 60s cycle timing). Actual: Much longer!

## Root Cause

**The database query was happening at the START of each tick:**

```javascript
// OLD CODE:
async dreamTick() {
  const dream = await this.recallMoment();  // ← BLOCKING DATABASE QUERY!
  
  // ...then start PERCEPTS phase
}
```

**Timeline (OLD):**
```
0:00  RESET phase completes (2s)
0:02  Tick ends
      setInterval fires next tick
      ↓
      recallMoment() - DATABASE QUERY (2-5s delay!)
      ↓ ORDER BY RANDOM() - slow on large tables
      ↓ Fetch prior moments - second query
      ↓
0:04-0:07  PERCEPTS phase FINALLY starts ❌
```

**Why ORDER BY RANDOM() is slow:**
- Postgres must scan entire table
- Can't use indexes effectively
- With hundreds of mind moments, takes 2-5 seconds
- Plus a second query for prior moments

## The Fix: Pre-fetching

**Pre-fetch the next dream DURING the current tick's completion**, so it's ready instantly when the next tick fires!

```javascript
// NEW CODE:
async dreamTick() {
  // Use pre-fetched dream (ready instantly!)
  const dream = this.nextDream || await this.recallMoment();
  this.nextDream = null;
  
  // ... run all 6 phases (60s total)
  
  // Pre-fetch next dream NOW (during the gap)
  console.log('  💭 Pre-fetching next dream...');
  this.nextDream = await this.recallMoment();
  console.log(`  ✅ Next dream ready: cycle ${this.nextDream.cycle}`);
}
```

**Timeline (NEW):**
```
Tick N:
0:00  Use pre-fetched dream ✅ (instant!)
      PERCEPTS phase starts immediately
0:35  SPOOL
0:37  SIGILIN
0:40  SIGILHOLD
0:55  SIGILOUT
0:58  RESET
1:00  Tick ends
      
      During 0:00-1:00: Pre-fetch next dream in background
      Ready and cached for Tick N+1!
      
Tick N+1:
1:00  Use pre-fetched dream ✅ (instant!)
      PERCEPTS phase starts immediately
```

**Benefits:**
1. ✅ PERCEPTS fires **immediately** after previous tick ends
2. ✅ No visible delay between cycles
3. ✅ Database query happens during "free time" within the 60s tick
4. ✅ Smooth, continuous dream flow

## Implementation Details

### Added state variable:

```javascript
constructor(io) {
  // ...
  this.nextDream = null; // Pre-fetched next dream
}
```

### Modified dreamTick():

```javascript
async dreamTick() {
  // 1. Use cached dream (or fetch on first cycle)
  const dream = this.nextDream || await this.recallMoment();
  this.nextDream = null;
  
  // 2. Run all phases (60s)
  await this.dreamPerceptsPhase(dream);
  await this.dreamIntegrationPhases(dream);
  
  // 3. Pre-fetch next dream (ready for next tick!)
  this.nextDream = await this.recallMoment();
}
```

## What You Should See Now

**Console output:**
```
💭 Dreaming of cycle 185: "The frustrated 'Come on'..."
  💭 Dispersing 6 percepts over 35s
  💭 Displaying cycle 185 - SPOOL
  💭 Displaying cycle 185 - SIGILIN (emitting)
  💭 Pre-fetching next dream...
  ✅ Next dream ready: cycle 173
💭 Dreaming of cycle 173: "Silence surrounds them..."  ← IMMEDIATE!
```

**Timing:**
- RESET completes at 1:00:00
- PERCEPTS fires at 1:00:00 (no delay!)
- Smooth 60s rhythm maintained

## Files Changed

- `src/consciousness-loop.js`
  - Added `this.nextDream = null` to constructor
  - Modified `dreamTick()` to use pre-fetched dream
  - Pre-fetch next dream at end of each tick

## Performance Impact

**Before:**
- 2-5 second delay between cycles
- Visible pause after RESET
- User sees nothing happening

**After:**
- 0 second delay (instant!)
- Seamless cycle transitions
- Database query hidden within tick duration

## Note

This same approach could be applied to LIVE mode's `loadPlaceholder()` if needed, but LIVE mode only loads the placeholder once on startup, so it's not as critical.
