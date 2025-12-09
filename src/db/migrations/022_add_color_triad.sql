-- Add color triad column to mind_moments
-- Part of circumplex color system implementation

-- Add color column (stores primary, secondary, accent hex colors)
ALTER TABLE mind_moments 
ADD COLUMN IF NOT EXISTS color JSONB DEFAULT NULL;

-- Add index for color queries (optional, useful for analytics)
CREATE INDEX IF NOT EXISTS idx_mind_moments_color 
ON mind_moments USING GIN (color);

-- Note: Existing mind moments will have NULL color values.
-- A backfill script can regenerate colors from circumplex data if needed.

-- Migration metadata
INSERT INTO schema_migrations (version) VALUES (22);
