import 'dotenv/config';
import { dumpPercepts } from './fake-percepts.js';
import { cognize, onMindMoment, getHistory } from './real-cog.js';

const DEPTH = 3;

onMindMoment((cycle, mindMoment, visualPercepts, audioPercepts, priorMoments, sigilPhrase) => {
  console.log(`${'─'.repeat(50)}`);
  console.log(`📊 HISTORY STATUS`);
  console.log(`${'─'.repeat(50)}`);
  const history = getHistory();
  const completedCycles = Object.keys(history)
    .map(Number)
    .filter(c => history[c].mindMoment !== "awaiting");
  
  console.log(`Total cycles: ${Object.keys(history).length}`);
  console.log(`Completed: ${completedCycles.length}`);
  console.log(`Awaiting: ${Object.keys(history).length - completedCycles.length}`);
  
  if (completedCycles.length > 0) {
    console.log(`\nRecent Mind Moments:`);
    completedCycles.slice(-3).forEach(c => {
      const entry = history[c];
      console.log(`   #${c}: "${entry.mindMoment}"${entry.sigilPhrase ? ` → [${entry.sigilPhrase}]` : ''}`);
    });
  }
  console.log('');
});

setInterval(() => {
  const { visualPercepts, audioPercepts } = dumpPercepts();
  cognize(visualPercepts, audioPercepts, DEPTH);
}, 5000);

console.log('╔═══════════════════════════════════════════════════════════╗');
console.log('║  COGNIZER - UNI Mind Moment System                       ║');
console.log('╚═══════════════════════════════════════════════════════════╝');
console.log('');
console.log('👁️  Visual percepts: every 3s');
console.log('🎤 Audio percepts: every 7-10s (random)');
console.log('🧠 Cognitive cycles: every 5s');
console.log(`🧵 Context depth: ${DEPTH} prior mind moments`);
console.log('');
console.log('Running...\n');

