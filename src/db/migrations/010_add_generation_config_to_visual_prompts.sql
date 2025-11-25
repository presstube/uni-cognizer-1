-- Add generation config fields to visual_prompts
-- These control the Gemini Live API generation behavior

ALTER TABLE visual_prompts 
ADD COLUMN IF NOT EXISTS temperature DECIMAL(3,2) DEFAULT 0.8,
ADD COLUMN IF NOT EXISTS top_p DECIMAL(3,2) DEFAULT 0.9,
ADD COLUMN IF NOT EXISTS top_k INTEGER DEFAULT 40,
ADD COLUMN IF NOT EXISTS max_output_tokens INTEGER DEFAULT 1024;

-- Add comments
COMMENT ON COLUMN visual_prompts.temperature IS 'Controls randomness (0.0-2.0). Higher = more creative';
COMMENT ON COLUMN visual_prompts.top_p IS 'Nucleus sampling (0.0-1.0). Controls diversity';
COMMENT ON COLUMN visual_prompts.top_k IS 'Top-K sampling. Number of tokens to consider';
COMMENT ON COLUMN visual_prompts.max_output_tokens IS 'Maximum response length in tokens';

-- Update existing prompts with defaults
UPDATE visual_prompts 
SET 
  temperature = 0.8,
  top_p = 0.9,
  top_k = 40,
  max_output_tokens = 1024
WHERE temperature IS NULL;


