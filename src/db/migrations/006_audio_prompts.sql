-- Audio Prompts for Microphone Analysis
-- Allows saving and managing system/user prompts for audio perception

CREATE TABLE IF NOT EXISTS audio_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  system_prompt TEXT NOT NULL,
  user_prompt TEXT NOT NULL,
  active BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Only one active prompt at a time
CREATE UNIQUE INDEX idx_audio_prompts_active 
  ON audio_prompts (active) 
  WHERE active = true;

-- Track updates
CREATE INDEX idx_audio_prompts_updated 
  ON audio_prompts (updated_at DESC);

-- Seed with default prompt
INSERT INTO audio_prompts (name, slug, system_prompt, user_prompt, active) VALUES (
  'Audio Analysis v1.0',
  'audio-analysis-v1-0',
  'You are analyzing audio percepts from a microphone for UNI, an AI experiencing the world through sensors.

TASK: Analyze the audio and create a structured percept.

Listen for:
- Speech content (transcripts)
- Environmental sounds
- Tone, emotion, sentiment
- Background noise patterns
- Silence vs. activity

Always respond with valid JSON in this exact format:
{
  "transcript": "exact words spoken, or null if no speech",
  "analysis": "description of what you hear",
  "tone": "emotional tone detected",
  "emoji": "relevant emoji",
  "sentiment": "positive|negative|neutral|curious|emotional",
  "confidence": 0.0-1.0
}',
  'Analyze this audio chunk and return the JSON percept.',
  true
);

