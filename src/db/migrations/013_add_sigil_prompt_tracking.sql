-- Add sigil_prompt_id tracking to mind_moments
-- Migration 013: Track which sigil prompt generated each sigil

ALTER TABLE mind_moments 
  ADD COLUMN IF NOT EXISTS sigil_prompt_id UUID REFERENCES sigil_prompts(id);

-- Index for querying mind moments by sigil prompt
CREATE INDEX IF NOT EXISTS idx_mind_moments_sigil_prompt 
  ON mind_moments(sigil_prompt_id);

-- Comment
COMMENT ON COLUMN mind_moments.sigil_prompt_id IS 
  'References the sigil_prompts.id that generated this sigil. Enables A/B testing and analytics.';

-- Insert into schema_migrations
INSERT INTO schema_migrations (version) 
VALUES (13)
ON CONFLICT (version) DO NOTHING;

