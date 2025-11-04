# Cognizer Roadmap: From Goldfish to Remembrance

**Vision**: A robot that recognizes individual humans, remembers past sessions, and builds ongoing relationships through accumulated memory.

**Current State**: MVP with 1-cycle memory (previous emotional state only)

**Target State**: User-aware system with persistent episodic memory keyed by facial recognition

---

## Stage 0: MVP - Goldfish + 1 Cycle ✓ (Current)

**What it does:**
- 5-second cognitive loop
- Mock percepts → emotional plan (JSON)
- Remembers only previous cycle's emotional state
- No persistence, no user awareness

**Memory model:**
```
[Previous State] → [Current Percepts] → [New Emotional Plan]
```

**Tech**: Node.js, GPT-4o, in-memory state

**Status**: Building now (2-3 hours)

---

## Stage 1: Session Memory (In-Session Only)

**What it adds:**
- Vector DB for semantic memory within session
- Store emotional plans as they happen
- Retrieve relevant memories each cycle
- Personality continuity during single run

**Memory model:**
```
[Session Memories] + [Previous State] + [Percepts] → [Emotional Plan]
                ↓
        [Store to Vector DB]
```

**Architecture changes:**
- Add ChromaDB (in-memory mode)
- Store emotional plans with embeddings
- Query: "Given current percepts, what's relevant from this session?"
- Memories cleared on restart

**Example behavior:**
```
Cycle 10: Person mentions they like jazz
Cycle 50: Person hums a tune
          → Robot recalls jazz comment, responds with recognition
```

**Tech additions**: ChromaDB

**Time**: +4 hours

---

## Stage 2: Persistent Session Storage

**What it adds:**
- Sessions saved to disk between runs
- Session metadata (start time, duration, emotional arc)
- Session retrieval by timestamp
- No user identification yet (anonymous sessions)

**Storage schema:**
```
sessions/
  session_20251104_143052.json
    {
      id: uuid,
      started_at: timestamp,
      ended_at: timestamp,
      emotional_plans: [...],
      percept_summary: "...",
      session_digest: "A contemplative interaction with..."
    }
```

**Architecture changes:**
- SQLite for session metadata
- JSON files for full session dumps
- Session digest generated at end (GPT-4o summary)
- ChromaDB persists to disk

**Example behavior:**
```
Session ends → GPT-4o generates narrative summary
              → Store session with emotional arc
Next run      → Can reference "previous session" generically
```

**Tech additions**: SQLite, filesystem storage

**Time**: +3 hours

---

## Stage 3: User Identification (Facial Recognition)

**What it adds:**
- Gemini Live percepts include facial recognition
- Extract user_id from visual percepts
- Track which user is present each cycle
- Anonymous fallback for unknown faces

**Percept format evolution:**
```javascript
// Before:
{ visual: "Person enters room", audio: null }

// After:
{ 
  visual: "Person enters room",
  audio: null,
  user_id: "face_embedding_hash_abc123",  // or null if unknown
  confidence: 0.92
}
```

**Architecture changes:**
- Gemini Live processes video frames
- On-device face detection (WebNN or TensorFlow.js)
- Generate stable user_id from face embedding
- Store mapping: user_id → first_seen, encounter_count

**Example behavior:**
```
Unknown person enters → user_id: "anon_temp_001"
Same person next session → user_id: "face_hash_xyz789" (recognized)
```

**Tech additions**: Face detection model, embedding generation

**Time**: +6 hours (includes Gemini integration work)

---

## Stage 4: User-Specific Memory Recall

**What it adds:**
- Sessions keyed by user_id
- When user detected, retrieve their past sessions
- Load digests into cognitive context
- Personalized emotional continuity

**Storage schema evolution:**
```
users/
  face_hash_xyz789/
    metadata.json
      {
        user_id: "face_hash_xyz789",
        first_seen: timestamp,
        last_seen: timestamp,
        total_sessions: 5,
        relationship_summary: "Quiet observer who..."
      }
    sessions/
      session_001.json
      session_002.json
      ...
```

**Memory retrieval hierarchy:**
```
[User Detected]
    ↓
[Load User Metadata] → relationship summary
    ↓
[Load Recent Sessions] → last 3 session digests
    ↓
[Query Vector DB] → semantic recall from all user's memories
    ↓
[Context Window] → Previous state + Percepts + User history
    ↓
[Emotional Plan] → Informed by past relationship
```

**Example behavior:**
```
User "face_xyz" returns after 1 week:
  → Robot recalls: "You mentioned you were working on a painting"
  → Emotional state influenced by accumulated relationship context
  → "It's good to see you again" (genuine, not generic)
```

**Prompt changes:**
```javascript
// Add to cognitive core prompt:
"You are interacting with a person you've met before. 

Your relationship history:
${userMetadata.relationship_summary}

Recent sessions:
${recentSessionDigests.join('\n')}

Relevant memories:
${retrievedMemories.join('\n')}

Be genuine about recognition and continuity."
```

**Tech additions**: User-keyed storage, hierarchical retrieval

**Time**: +4 hours

---

## Stage 5: Multi-Session Personality Evolution

**What it adds:**
- Reflection loops across sessions
- Relationship modeling (affinity, familiarity, trust)
- Long-term personality consistency per user
- Session-end relationship update

**Architecture changes:**
- After each session, update user relationship summary
- Generate reflection: "How has our relationship evolved?"
- Store emotional patterns per user
- Consistency checks against user-specific personality

**Example behavior:**
```
Session 1 with User A: Cautious, observing
Session 5 with User A: Playful, comfortable
Session 1 with User B: Fresh, curious (independent relationship)
```

**Relationship metadata:**
```json
{
  "user_id": "face_xyz",
  "relationship_summary": "...",
  "emotional_patterns": {
    "typical_valence": 0.4,
    "openness": 0.7,
    "playfulness": 0.6
  },
  "shared_references": [
    "jazz music",
    "their painting project",
    "Tuesday afternoon visits"
  ],
  "relationship_arc": "Growing comfort and mutual curiosity"
}
```

**Tech additions**: Relationship modeling, cross-session reflection

**Time**: +5 hours

---

## Stage 6: Art System Integration (Per-User)

**What it adds:**
- User-specific emotional plans influence art
- Art adapters receive user context
- Visual/kinetic/audio systems respond to relationship state
- Personalized artistic expression

**Flow:**
```
[User Detected] → [Memory Recall] → [Emotional Plan + User Context]
                                              ↓
                                    [Art Adapter]
                                              ↓
                            [User-Aware Art Commands]
                                              ↓
                    [Visual] [Kinetic] [Audio] Systems
```

**Example behavior:**
```
User A (familiar, playful):
  → Colors: warm, inviting palette
  → Motion: responsive, following gestures
  → Audio: upbeat, interactive

User B (new, cautious):
  → Colors: neutral, calm
  → Motion: slow, observing
  → Audio: ambient, non-intrusive
```

**Tech additions**: User context in art adapter prompts

**Time**: +3 hours (assumes Stage 1 adapter work done)

---

## Stage 7: Multi-User Scenarios

**What it adds:**
- Handle multiple faces in frame
- Group interaction dynamics
- Prioritize attention between users
- Relationship context for each person present

**Challenges:**
- Whose context to load? (all present users)
- How to balance attention?
- Group dynamics vs individual relationships

**Architecture:**
```
[Multiple Faces Detected]
        ↓
[Load Context for All]
        ↓
[Emotional Plan Considers Group]
        ↓
[Art Systems Balance Between Relationships]
```

**Tech additions**: Multi-user context aggregation, attention model

**Time**: +6 hours

---

## Technical Evolution Summary

| Stage | Memory Type | Persistence | User Awareness | Complexity |
|-------|------------|-------------|----------------|------------|
| 0 | 1 cycle | None | None | Minimal |
| 1 | Session | In-memory | None | Low |
| 2 | Session | Disk | None | Low-Med |
| 3 | Session | Disk | Identification only | Medium |
| 4 | User-keyed | Disk | Full recall | Medium-High |
| 5 | Cross-session | Disk | Relationship model | High |
| 6 | User + Art | Disk | Creative expression | High |
| 7 | Multi-user | Disk | Group dynamics | Very High |

---

## Data Flow Evolution

**Stage 0 (MVP):**
```
Percepts → [Previous State] → GPT-4o → Emotional Plan
```

**Stage 2 (Sessions):**
```
Percepts → [Previous State + Session Memories] → GPT-4o → Plan → Store
```

**Stage 4 (User-Aware):**
```
Percepts → [User Detected] → [Load User History]
                                    ↓
                    [Previous + Session + User Memories]
                                    ↓
                                 GPT-4o
                                    ↓
                    [Emotional Plan] → Store to User
```

**Stage 6 (Full System):**
```
Percepts → [User] → [History] → [Cognitive] → [Emotional Plan]
                                                       ↓
                                            [Art Adapters + User Context]
                                                       ↓
                                            [Visual][Kinetic][Audio]
```

---

## Privacy & Ethics Considerations

**Facial Recognition:**
- Store embeddings only (not images)
- User consent mechanism (opt-in/opt-out)
- Anonymous mode available
- Data retention policies (delete after N months)

**Memory Storage:**
- No audio/video recordings stored
- Only emotional digests and percept summaries
- User can request data deletion
- No biometric data shared externally

**Implementation:**
```javascript
// User metadata includes:
{
  consent: boolean,
  anonymous_mode: boolean,
  data_retention_days: 90,
  can_delete: true
}
```

---

## Critical Decision Points

**After Stage 1**: Does session memory improve personality coherence?
- ✅ Yes → Continue to Stage 2
- ❌ No → Iterate on prompts, may not need full roadmap

**After Stage 3**: Is facial recognition reliable enough?
- ✅ Yes → Continue to Stage 4
- ❌ No → Use RFID/QR codes, or remain user-agnostic

**After Stage 4**: Do user-specific memories create resonance?
- ✅ Yes → This validates the relationship model
- ❌ No → May need different approach to "recognition"

---

## Timeline Estimate

| Stage | Effort | Cumulative |
|-------|--------|------------|
| 0 | 3 hours | 3 hours |
| 1 | 4 hours | 7 hours |
| 2 | 3 hours | 10 hours |
| 3 | 6 hours | 16 hours |
| 4 | 4 hours | 20 hours |
| 5 | 5 hours | 25 hours |
| 6 | 3 hours | 28 hours |
| 7 | 6 hours | 34 hours |

**Total**: ~1 week of focused development (excluding testing/iteration)

---

## Open Questions

1. **Embedding model for faces**: MediaPipe? FaceNet? WebNN-compatible?
2. **User_id collision risk**: How to handle similar faces?
3. **Memory pruning**: Delete old sessions? Compress to summaries?
4. **Cross-session mood baseline**: Should relationships have "default" emotional states?
5. **Group interaction priority**: Attention model for multiple users?
6. **Recognition feedback**: Should robot signal when it recognizes someone?

---

## Success Metrics

**Stage 0**: Emotional plans feel alive (subjective)

**Stage 1**: Personality coherence within session (can reference earlier in conversation)

**Stage 2**: Sessions have narrative arcs (beginning/middle/end feel)

**Stage 4**: User recognition creates genuine moment ("You're back!")

**Stage 5**: Relationships evolve naturally (playfulness increases, trust builds)

**Stage 6**: Art responds meaningfully to individual users

**Stage 7**: Robot handles groups gracefully

---

## Philosophy

> "Start goldfish. Become elephant. But only add memory when forgetting hurts."

Memory is expensive (computationally, cognitively, creatively). Each stage should be **necessary**, not just **possible**.

The goal isn't to remember everything—it's to remember what deepens the relationship.

---

**Next Step**: Build Stage 0 (MVP). Validate emotional aliveness. Then decide if memory is needed, or if the goldfish is enough.

