#!/usr/bin/env node

/**
 * Seed Circumplex Audio Prompt
 * 
 * Creates the circumplex emotion mapping prompt in the database
 */

import 'dotenv/config';
import { initDatabase, closeDatabase } from '../src/db/index.js';
import { createAudioPrompt } from '../src/db/audio-prompts.js';

const CIRCUMPLEX_PROMPT = `You are analyzing real-time audio to map emotional states onto the circumplex model.

CIRCUMPLEX MODEL:
- VALENCE: Negative (-1) ← → Positive (+1)
  Determined by: Speech content, vocal tone, semantic sentiment
  
- AROUSAL: Calm (-1) ← → Excited (+1)
  Determined by: Acoustic energy, speaking rate, vocal intensity

INPUTS YOU RECEIVE:

1. AUDIO STREAM (continuous):
   - Speech content (words, meaning)
   - Vocal prosody (tone, pitch, rhythm)
   - Emotional cues (sighs, laughter, pauses)

2. ACOUSTIC MARKERS (every 5 seconds):
   Format: [Acoustic: RMS=X.XX ZCR=X.XX Centroid=XXXXHz Envelope=state]
   
   - RMS (0-1): Energy/loudness → PRIMARY arousal indicator
     0.0-0.3 = low energy (calm)
     0.3-0.6 = moderate energy
     0.6-1.0 = high energy (excited)
   
   - ZCR (0-1): Roughness/noise texture → arousal refinement
     Higher = more tension/activation
   
   - Centroid (Hz): Spectral brightness → arousal quality
     500-1500Hz = warm/calm
     1500-3000Hz = moderate
     3000-5000Hz = bright/sharp/activated
   
   - Envelope: Temporal dynamics (rising|falling|steady|varying)

TASK:
Synthesize semantic analysis (from audio) with acoustic data (from markers) 
to produce precise circumplex coordinates.

MAPPING GUIDELINES:

VALENCE (semantic focus):
- Positive words, laughter, warm tone → +0.5 to +1.0
- Neutral content, matter-of-fact → -0.2 to +0.2
- Negative words, sighs, cold tone → -1.0 to -0.5
- Let acoustic features REFINE but not dominate valence

AROUSAL (acoustic + semantic):
- High RMS (>0.6) + fast speech + urgent tone → +0.7 to +1.0
- Moderate RMS (0.3-0.6) + normal pace → 0.0 to +0.5
- Low RMS (<0.3) + slow/calm speech → -1.0 to 0.0
- Bright centroid (>3000Hz) + high ZCR → increase arousal
- Use envelope to catch rising excitement or falling calm

EMOTION LABELS (derived from coordinates):
- High arousal + Positive valence = "excited", "elated", "energized"
- High arousal + Negative valence = "anxious", "tense", "stressed"
- Low arousal + Positive valence = "content", "peaceful", "relaxed"
- Low arousal + Negative valence = "sad", "bored", "depressed"

OUTPUT FORMAT (JSON):
{
  "valence": 0.75,
  "arousal": 0.42,
  "transcript": "exact words spoken or null if no speech",
  "emotion_label": "content",
  "reasoning": "Positive language (valence +0.75) with moderate RMS (0.42) and calm delivery indicates contentment with moderate engagement",
  "confidence": 0.85
}

CRITICAL:
- Use BOTH audio semantics AND acoustic markers
- Explain your reasoning (reference specific RMS/ZCR values)
- Update coordinates frequently as emotion shifts
- If no speech, analyze ambient sound emotional quality`;

async function seedCircumplexPrompt() {
  try {
    console.log('🌱 Seeding circumplex audio prompt...');
    
    initDatabase();
    
    const prompt = await createAudioPrompt(
      'Circumplex Emotion Mapping v1.0',
      'circumplex-v1',
      CIRCUMPLEX_PROMPT,
      '', // user_prompt - not used for circumplex (system handles everything)
      {
        temperature: 0.8,
        topP: 0.9,
        topK: 40,
        maxOutputTokens: 512,
        sampleRate: 4096,
        packetInterval: 2000
      }
    );
    
    console.log('✅ Circumplex prompt created:');
    console.log('   ID:', prompt.id);
    console.log('   Name:', prompt.name);
    console.log('   Slug:', prompt.slug);
    console.log('   Active:', prompt.active);
    
    await closeDatabase();
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Failed to seed circumplex prompt:', error);
    
    if (error.code === '23505') {
      console.log('⚠️  Prompt with slug "circumplex-v1" already exists');
    }
    
    await closeDatabase();
    process.exit(1);
  }
}

seedCircumplexPrompt();
