-- Migration 020: Add sound_brief to mind_moments
-- Adds JSONB column to store sound generation results from Gemini Flash Exp

ALTER TABLE mind_moments
ADD COLUMN sound_brief JSONB DEFAULT NULL;

-- Optional: Add index for querying moments with sound briefs
CREATE INDEX idx_mind_moments_sound_brief 
ON mind_moments ((sound_brief IS NOT NULL))
WHERE sound_brief IS NOT NULL;

COMMENT ON COLUMN mind_moments.sound_brief IS 'Sound generation result including selections, reasoning, and sample metadata';
