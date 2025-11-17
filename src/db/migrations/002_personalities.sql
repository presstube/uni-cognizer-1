-- Personality Management System
-- Migration 002: Add personalities table and link to mind_moments

-- Create personalities table
CREATE TABLE IF NOT EXISTS personalities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  prompt TEXT NOT NULL,
  active BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Ensure only one personality can be active at a time
CREATE UNIQUE INDEX IF NOT EXISTS idx_personalities_one_active 
  ON personalities(active) 
  WHERE active = true;

-- Add personality_id to mind_moments
ALTER TABLE mind_moments 
  ADD COLUMN IF NOT EXISTS personality_id UUID REFERENCES personalities(id);

-- Index for querying mind moments by personality
CREATE INDEX IF NOT EXISTS idx_mind_moments_personality 
  ON mind_moments(personality_id);

-- Insert into schema_migrations
INSERT INTO schema_migrations (version) 
VALUES (2)
ON CONFLICT (version) DO NOTHING;

