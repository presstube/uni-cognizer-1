-- Add LLM settings column to sigil_prompts
-- Allows each prompt to have its own provider, model, and creativity settings

ALTER TABLE sigil_prompts 
ADD COLUMN IF NOT EXISTS llm_settings JSONB DEFAULT '{
  "provider": "anthropic",
  "model": "claude-sonnet-4-5-20250929",
  "temperature": 0.7,
  "top_p": 0.9,
  "max_tokens": 1024,
  "top_k": null
}'::jsonb;

-- Add comment explaining the structure
COMMENT ON COLUMN sigil_prompts.llm_settings IS 
'LLM configuration for this prompt. Structure: {
  provider: "anthropic" | "gemini",
  model: string (provider-specific model name),
  temperature: number (0.0-1.0 for Anthropic, 0.0-2.0 for Gemini),
  top_p: number (0.0-1.0),
  top_k: number | null (Gemini only, 1-40),
  max_tokens: number
}';

-- Update existing rows to have default settings if NULL
UPDATE sigil_prompts 
SET llm_settings = '{
  "provider": "anthropic",
  "model": "claude-sonnet-4-5-20250929",
  "temperature": 0.7,
  "top_p": 0.9,
  "max_tokens": 1024,
  "top_k": null
}'::jsonb
WHERE llm_settings IS NULL;

