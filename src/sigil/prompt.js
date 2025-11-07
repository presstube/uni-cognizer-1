/**
 * Builds the prompt for sigil generation
 * @param {string} concept - The concept to generate a sigil for
 * @returns {string} The formatted prompt
 */
export function buildPrompt(concept) {
  return `Generate JavaScript canvas drawing commands for a sigil representing "${concept}".

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

Code:`;
}

