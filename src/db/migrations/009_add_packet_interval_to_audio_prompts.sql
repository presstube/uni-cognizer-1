-- Add packet_interval to audio_prompts
-- Controls how often audio packets are sent to Gemini Live API

ALTER TABLE audio_prompts 
ADD COLUMN IF NOT EXISTS packet_interval INTEGER DEFAULT 2000;

COMMENT ON COLUMN audio_prompts.packet_interval IS 'Packet send interval (ms). Lower = faster responses, more API calls. Common: 500, 1000, 2000';

-- Update existing prompts with default
UPDATE audio_prompts 
SET packet_interval = 2000
WHERE packet_interval IS NULL;

