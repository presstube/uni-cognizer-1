#!/usr/bin/env node

/**
 * Quick test of circumplexToColor function
 * Run: node scripts/test-color-function.js
 */

import { circumplexToColor, ETHEREAL_VAPOUR_PALETTE } from '../src/circumplex-to-color.js';

console.log('🎨 Testing Circumplex to Color Conversion\n');
console.log('═'.repeat(70));

const testCases = [
  { name: 'Center (Neutral)', circumplex: { valence: 0, arousal: 0 } },
  { name: 'Q1 - Happy', circumplex: { valence: 0.8, arousal: 0.6 } },
  { name: 'Q2 - Angry', circumplex: { valence: -0.7, arousal: 0.6 } },
  { name: 'Q3 - Sad', circumplex: { valence: -0.5, arousal: -0.5 } },
  { name: 'Q4 - Calm', circumplex: { valence: 0.5, arousal: -0.5 } },
  { name: 'Edge - Max Happy', circumplex: { valence: 1.0, arousal: 1.0 } },
  { name: 'Edge - Max Sad', circumplex: { valence: -1.0, arousal: -1.0 } }
];

testCases.forEach(test => {
  console.log(`\n${test.name}:`);
  console.log(`  Valence: ${test.circumplex.valence.toFixed(2)}, Arousal: ${test.circumplex.arousal.toFixed(2)}`);
  
  const color = circumplexToColor(test.circumplex, ETHEREAL_VAPOUR_PALETTE);
  
  console.log(`  Primary:   ${color.primary}`);
  console.log(`  Secondary: ${color.secondary}`);
  console.log(`  Accent:    ${color.accent}`);
});

console.log('\n' + '═'.repeat(70));
console.log('✅ Color conversion test complete!\n');
