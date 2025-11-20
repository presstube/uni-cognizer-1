-- Sigil Prompt Versioning
-- Allows user-directed crafting and testing of sigil generation prompts

CREATE TABLE IF NOT EXISTS sigil_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  prompt TEXT NOT NULL,
  active BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Only one active prompt at a time
CREATE UNIQUE INDEX IF NOT EXISTS idx_sigil_prompts_active 
  ON sigil_prompts (active) 
  WHERE active = true;

-- Track updates
CREATE INDEX IF NOT EXISTS idx_sigil_prompts_updated 
  ON sigil_prompts (updated_at DESC);

-- Seed with current production prompt
INSERT INTO sigil_prompts (name, slug, prompt, active) 
VALUES (
  'Sigil Prompt v1.0',
  'sigil-prompt-v1-0',
  'Generate JavaScript canvas drawing commands for a sigil representing "${concept}".

Match the style from the reference image. Balance geometric precision with organic fluidity.

RULES:
1. Available methods:
   - ctx.moveTo(x, y)
   - ctx.lineTo(x, y)
   - ctx.arc(x, y, radius, 0, Math.PI * 2)
   - ctx.quadraticCurveTo(cpx, cpy, x, y) - 4 parameters
   - ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y) - 6 parameters
   - ctx.beginPath(), ctx.closePath(), ctx.stroke()
2. MIX geometric and organic - use both straight lines AND curves
3. Sharp angles and clean lines give structure
4. Gentle curves add flow and warmth
5. STRONGLY FAVOR symmetry - create balanced, centered compositions
6. Occasional asymmetry is welcome for visual interest (1 in 4 elements)
7. Small asymmetric details add character without breaking overall balance
8. AVOID explicit faces - no literal eyes, mouths, noses (subtle allusions OK)
9. Create abstract symbolic forms, not realistic depictions
10. Canvas is 100x100, center at (50, 50)
11. Maximum 30 lines
12. NO variables, NO functions, NO explanations
13. Output ONLY the ctx commands

Code:',
  true
) ON CONFLICT (slug) DO NOTHING;
