-- Visual Prompts for Webcam Analysis
-- Allows saving and managing system/user prompts for visual perception

CREATE TABLE IF NOT EXISTS visual_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  system_prompt TEXT NOT NULL,
  user_prompt TEXT NOT NULL,
  active BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Only one active prompt at a time
CREATE UNIQUE INDEX idx_visual_prompts_active 
  ON visual_prompts (active) 
  WHERE active = true;

-- Track updates
CREATE INDEX idx_visual_prompts_updated 
  ON visual_prompts (updated_at DESC);

-- Seed with current default prompt
INSERT INTO visual_prompts (name, slug, system_prompt, user_prompt, active) VALUES (
  'Visual Analysis v1.0',
  'visual-analysis-v1-0',
  'You are analyzing visual percepts from a webcam for UNI, an AI experiencing the world through sensors.

TASK: Create a sigil to represent what you see.

STEP 1: Create a "sigil phrase" - a punchy, poetic 2-4 word distillation of the moment.
STEP 2: Generate canvas drawing commands for a sigil representing that phrase.

Match the style from typical symbolic sigils. Balance geometric precision with organic fluidity.

RULES:
1. Available methods:
   - ctx.moveTo(x, y)
   - ctx.lineTo(x, y)
   - ctx.arc(x, y, radius, 0, Math.PI * 2)
   - ctx.quadraticCurveTo(cpx, cpy, x, y) - 4 parameters
   - ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y) - 6 parameters
   - ctx.beginPath(), ctx.closePath(), ctx.stroke()

2. PATH MANAGEMENT - CRITICAL:
   - Start with ONE ctx.beginPath() at the beginning
   - Use ctx.moveTo() before EVERY separate element to avoid connecting lines
   - End with ONE ctx.stroke() at the very end
   - Example: ctx.beginPath(); ctx.moveTo(50,20); ...lines...; ctx.moveTo(30,40); ...new element...; ctx.stroke();

3. MIX geometric and organic - use both straight lines AND curves
4. Sharp angles and clean lines give structure
5. Gentle curves add flow and warmth
6. STRONGLY FAVOR symmetry - create balanced, centered compositions
7. Small asymmetric details add character without breaking overall balance
8. AVOID explicit faces - no literal eyes, mouths, noses (subtle allusions OK)
9. Create abstract symbolic forms, not realistic depictions
10. Canvas is 100x100, center at (50, 50)
11. Maximum 30 lines
12. NO variables, NO functions, NO explanations
13. Output ONLY the ctx commands

Also include a description in plain english. The first time you run, describe the scene completely. On subsequent runs describe anything significant that has changed or is happening.

Always respond with valid JSON in this exact format:
{
  "description": "A paragraph describing what you see in plain language",
  "sigilPhrase": "2-4 word poetic distillation",
  "drawCalls": "ctx.beginPath();\\nctx.moveTo(50,20);\\n..."
}',
  'Send back description and create sigilPhrase and sigil drawCalls for this moment.',
  true
);

