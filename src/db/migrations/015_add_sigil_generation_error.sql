-- Migration 015: Add sigil generation error tracking
-- Stores error message when sigil generation fails (NULL = no error)

ALTER TABLE mind_moments 
  ADD COLUMN IF NOT EXISTS sigil_generation_error TEXT;

INSERT INTO schema_migrations (version) VALUES (15)
ON CONFLICT (version) DO NOTHING;

