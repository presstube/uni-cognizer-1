-- Migration 016: Add PNG columns for simplified sigil rendering
-- Replaces complex SDF approach with straightforward transparent PNG

-- Add PNG columns
ALTER TABLE mind_moments 
  ADD COLUMN IF NOT EXISTS sigil_png_data BYTEA;

ALTER TABLE mind_moments 
  ADD COLUMN IF NOT EXISTS sigil_png_width INTEGER DEFAULT 512;

ALTER TABLE mind_moments 
  ADD COLUMN IF NOT EXISTS sigil_png_height INTEGER DEFAULT 512;

-- Index for querying moments with PNG data
CREATE INDEX IF NOT EXISTS idx_mind_moments_has_png 
  ON mind_moments(id) WHERE sigil_png_data IS NOT NULL;

