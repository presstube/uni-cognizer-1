-- Replace kinetic and lighting columns with circumplex
-- This migration supports the transition to circumplex emotional representation

-- Add circumplex column (valence and arousal axes)
ALTER TABLE mind_moments 
ADD COLUMN IF NOT EXISTS circumplex JSONB DEFAULT '{"valence": 0, "arousal": 0}'::jsonb;

-- Drop old kinetic and lighting columns (if they exist)
ALTER TABLE mind_moments 
DROP COLUMN IF EXISTS kinetic,
DROP COLUMN IF EXISTS lighting;

-- Add index for circumplex queries
CREATE INDEX IF NOT EXISTS idx_mind_moments_circumplex ON mind_moments USING GIN (circumplex);

-- Note: Existing data will have NULL circumplex values.
-- The default is only for new inserts going forward.
