-- Make CSVs system-wide instead of per-prompt
-- Remove CSV references from sound_prompts
-- Add "active" flag to sound_csv_files

-- Remove CSV references from prompts
ALTER TABLE sound_prompts 
  DROP COLUMN IF EXISTS music_csv_id,
  DROP COLUMN IF EXISTS texture_csv_id;

-- Add active flag to CSV files (only one active per type)
ALTER TABLE sound_csv_files
  ADD COLUMN active BOOLEAN DEFAULT false;

-- Create unique index so only one CSV of each type can be active
CREATE UNIQUE INDEX idx_sound_csv_active_music 
  ON sound_csv_files (type, active) 
  WHERE active = true AND type = 'music';

CREATE UNIQUE INDEX idx_sound_csv_active_texture 
  ON sound_csv_files (type, active) 
  WHERE active = true AND type = 'texture';

-- Set current defaults as active
UPDATE sound_csv_files 
SET active = true 
WHERE is_default = true;

-- Update migration version
INSERT INTO schema_migrations (version) 
VALUES (19)
ON CONFLICT (version) DO NOTHING;
