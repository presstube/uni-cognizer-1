-- Add generation config fields to personalities
-- These control the LLM provider and generation behavior

ALTER TABLE personalities 
ADD COLUMN IF NOT EXISTS provider VARCHAR(50) DEFAULT 'gemini',
ADD COLUMN IF NOT EXISTS model VARCHAR(200) DEFAULT 'gemini-2.0-flash-exp',
ADD COLUMN IF NOT EXISTS temperature DECIMAL(3,2) DEFAULT 0.7,
ADD COLUMN IF NOT EXISTS top_p DECIMAL(3,2) DEFAULT 0.9,
ADD COLUMN IF NOT EXISTS top_k INTEGER DEFAULT 40,
ADD COLUMN IF NOT EXISTS max_tokens INTEGER DEFAULT 1024;

-- Add comments
COMMENT ON COLUMN personalities.provider IS 'LLM provider (gemini, anthropic)';
COMMENT ON COLUMN personalities.model IS 'Model identifier';
COMMENT ON COLUMN personalities.temperature IS 'Controls randomness (0.0-2.0 for Gemini, 0.0-1.0 for Anthropic)';
COMMENT ON COLUMN personalities.top_p IS 'Nucleus sampling (0.0-1.0). Controls diversity';
COMMENT ON COLUMN personalities.top_k IS 'Top-K sampling. Number of tokens to consider (Gemini only)';
COMMENT ON COLUMN personalities.max_tokens IS 'Maximum response length in tokens';

-- Update existing personalities with defaults
UPDATE personalities 
SET 
  provider = 'gemini',
  model = 'gemini-2.0-flash-exp',
  temperature = 0.7,
  top_p = 0.9,
  top_k = 40,
  max_tokens = 1024
WHERE provider IS NULL;

-- Insert into schema_migrations
INSERT INTO schema_migrations (version) 
VALUES (12)
ON CONFLICT (version) DO NOTHING;


