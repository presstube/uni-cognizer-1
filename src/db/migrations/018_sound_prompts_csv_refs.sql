-- Add CSV file references to sound_prompts table
-- This allows each prompt to reference specific CSV files

ALTER TABLE sound_prompts 
  ADD COLUMN music_csv_id UUID REFERENCES sound_csv_files(id),
  ADD COLUMN texture_csv_id UUID REFERENCES sound_csv_files(id);

-- Add indexes for CSV lookups
CREATE INDEX idx_sound_prompts_music_csv ON sound_prompts(music_csv_id);
CREATE INDEX idx_sound_prompts_texture_csv ON sound_prompts(texture_csv_id);

-- Update migration version
INSERT INTO schema_migrations (version) 
VALUES (18)
ON CONFLICT (version) DO NOTHING;
