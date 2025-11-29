-- Migration 014: Add SVG and SDF storage for sigils
-- Adds columns to store multiple sigil formats

-- Add SVG column (text XML)
ALTER TABLE mind_moments 
  ADD COLUMN IF NOT EXISTS sigil_svg TEXT;

-- Add SDF columns (binary distance field data)
ALTER TABLE mind_moments 
  ADD COLUMN IF NOT EXISTS sigil_sdf_data BYTEA;

ALTER TABLE mind_moments 
  ADD COLUMN IF NOT EXISTS sigil_sdf_width INTEGER DEFAULT 256;

ALTER TABLE mind_moments 
  ADD COLUMN IF NOT EXISTS sigil_sdf_height INTEGER DEFAULT 256;

-- Optional: Add index for querying moments with SDF data
CREATE INDEX IF NOT EXISTS idx_mind_moments_has_sdf 
  ON mind_moments(id) WHERE sigil_sdf_data IS NOT NULL;

-- Update migration tracker
INSERT INTO schema_migrations (version) 
VALUES (14)
ON CONFLICT (version) DO NOTHING;

