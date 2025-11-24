-- Add sample_rate to audio_prompts and deprecate user_prompt
-- Sample rate controls audio processing frequency

ALTER TABLE audio_prompts 
ADD COLUMN IF NOT EXISTS sample_rate INTEGER DEFAULT 4096;

COMMENT ON COLUMN audio_prompts.sample_rate IS 'Audio buffer size (samples). Lower = smoother updates, higher = less CPU. Common: 512, 1024, 2048, 4096';

-- Update existing prompts with default
UPDATE audio_prompts 
SET sample_rate = 4096
WHERE sample_rate IS NULL;

