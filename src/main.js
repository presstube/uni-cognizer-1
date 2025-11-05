import { dumpPercepts } from './fake-percepts.js';
import { cognize } from './fake-cog.js';

setInterval(() => {
  const { visualPercepts, audioPercepts } = dumpPercepts();
  cognize(visualPercepts, audioPercepts);
}, 5000);

console.log('╔═══════════════════════════════════════════════════════════╗');
console.log('║  FAKE LAND - Timing Architecture Test                    ║');
console.log('╚═══════════════════════════════════════════════════════════╝');
console.log('');
console.log('👁️  Visual percepts: every 3s');
console.log('🎤 Audio percepts: every 7-10s (random)');
console.log('🧠 Cognitive cycles: every 5s');
console.log('⏱️  Mock LLM latency: 6-8s');
console.log('');
console.log('Running...\n');

