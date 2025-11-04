/**
 * MVP Cognizer-1: Main Cognitive Loop
 * 
 * Architecture:
 *   Mock Percepts → Cognitive Loop (5sec) → GPT-4o → Emotional Plan → Console
 * 
 * This is the robot's heartbeat - a continuous cycle of:
 *   1. Gathering percepts
 *   2. Processing them into emotional understanding
 *   3. Expressing that understanding
 */

import 'dotenv/config';
import { generateVisualPercept, generateAudioPercept, aggregatePercepts } from './mock-percepts.js';
import { generateEmotionalPlan } from './cognitive-core.js';

// Configuration
const COGNITIVE_CYCLE_MS = parseInt(process.env.COGNITIVE_CYCLE_MS) || 5000;
const VISUAL_PERCEPT_INTERVAL_MS = parseInt(process.env.VISUAL_PERCEPT_INTERVAL_MS) || 2000;
const AUDIO_PERCEPT_INTERVAL_MS = parseInt(process.env.AUDIO_PERCEPT_INTERVAL_MS) || 3000;

// State (in-memory only for MVP)
const perceptBuffer = [];
let previousEmotionalState = null;
let cycleCount = 0;

/**
 * Format emotional plan for console display
 */
function displayEmotionalPlan(plan, cycleNum) {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`🧠 Cognitive Cycle #${cycleNum}`);
  console.log(`${'═'.repeat(60)}`);
  console.log(`💭 Emotional State: ${plan.emotional_state}`);
  console.log(`📈 Mood: valence=${plan.mood_vector.valence.toFixed(2)}, arousal=${plan.mood_vector.arousal.toFixed(2)}`);
  console.log(`🎭 Expression: ${plan.poetic_expression}`);
  console.log(`🎯 Intent: ${plan.intent}`);
  console.log(`${'─'.repeat(60)}`);
}

/**
 * Visual Percept Generation Loop
 * Simulates camera percepts arriving continuously
 */
setInterval(() => {
  const percept = generateVisualPercept();
  perceptBuffer.push(percept);
  
  // Only log active percepts (not "NOPE")
  if (percept.action !== "NOPE") {
    console.log(`👁️  Visual: ${percept.emoji} ${percept.action}`);
  }
}, VISUAL_PERCEPT_INTERVAL_MS);

/**
 * Audio Percept Generation Loop
 * Simulates microphone percepts arriving less frequently
 */
setInterval(() => {
  const percept = generateAudioPercept();
  perceptBuffer.push(percept);
  
  // Only log meaningful audio (not silence)
  if (percept.transcript) {
    console.log(`🎤 Audio: ${percept.emoji} "${percept.transcript}"`);
  } else if (percept.analysis !== "Silence" && percept.analysis !== "Background ambient sounds only") {
    console.log(`🎤 Audio: ${percept.emoji} ${percept.analysis}`);
  }
}, AUDIO_PERCEPT_INTERVAL_MS);

/**
 * Core Cognitive Loop
 * Runs every 5 seconds - the robot's deliberative "heartbeat"
 */
setInterval(async () => {
  cycleCount++;
  
  // Step 1: Aggregate recent percepts
  const aggregated = aggregatePercepts(perceptBuffer, 5);
  console.log(`\n📊 Percepts: ${aggregated.visualCount} visual, ${aggregated.audioCount} audio (${aggregated.activeVisualCount} + ${aggregated.activeAudioCount} active)`);
  console.log(`📝 Summary: ${aggregated.summary}`);
  
  // Step 2: Generate emotional plan via GPT-4o
  try {
    const startTime = Date.now();
    const emotionalPlan = await generateEmotionalPlan(
      aggregated.summary,
      previousEmotionalState
    );
    const latency = Date.now() - startTime;
    
    // Step 3: Display results
    displayEmotionalPlan(emotionalPlan, cycleCount);
    console.log(`⏱️  Latency: ${latency}ms`);
    
    // Step 4: Update state for next cycle
    previousEmotionalState = emotionalPlan;
    
  } catch (error) {
    console.error(`\n❌ Cycle #${cycleCount} failed:`, error.message);
  }
  
  // Step 5: Clean old percepts (keep last 30 seconds)
  const cutoff = Date.now() - 30000;
  const beforeLength = perceptBuffer.length;
  
  while (perceptBuffer.length > 0 && 
         new Date(perceptBuffer[0].timestamp).getTime() < cutoff) {
    perceptBuffer.shift();
  }
  
  if (beforeLength !== perceptBuffer.length) {
    console.log(`🗑️  Cleaned ${beforeLength - perceptBuffer.length} old percepts`);
  }
  
}, COGNITIVE_CYCLE_MS);

// Startup message
console.log('╔═══════════════════════════════════════════════════════════╗');
console.log('║         MVP Cognizer-1: Core Cognitive Loop              ║');
console.log('╚═══════════════════════════════════════════════════════════╝');
console.log('');
console.log('🚀 Cognitive loop started');
console.log(`⏰ Cycle interval: ${COGNITIVE_CYCLE_MS}ms (${COGNITIVE_CYCLE_MS/1000}s)`);
console.log(`👁️  Visual percept interval: ${VISUAL_PERCEPT_INTERVAL_MS}ms`);
console.log(`🎤 Audio percept interval: ${AUDIO_PERCEPT_INTERVAL_MS}ms`);
console.log('');
console.log('Press Ctrl+C to stop');
console.log('');

