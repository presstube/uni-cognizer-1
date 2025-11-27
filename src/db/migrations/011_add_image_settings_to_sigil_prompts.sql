-- Add image-related columns to sigil_prompts
-- Allows each prompt to control whether to include reference image and which image to use

ALTER TABLE sigil_prompts 
ADD COLUMN IF NOT EXISTS include_image BOOLEAN DEFAULT true;

ALTER TABLE sigil_prompts 
ADD COLUMN IF NOT EXISTS reference_image_path VARCHAR(500) DEFAULT NULL;

COMMENT ON COLUMN sigil_prompts.include_image IS 
'Whether to include the reference image in sigil generation prompts';

COMMENT ON COLUMN sigil_prompts.reference_image_path IS 
'Relative path to custom reference image (e.g., sigil-references/abc123.png). NULL = use default image.';


