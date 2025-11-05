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
import { generateVisualPercept, generateAudioPercept, summarizePercepts } from './mock-percepts.js';
import { generateEmotionalPlan } from './cognitive-core.js';

// Configuration
const COGNITIVE_CYCLE_MS = parseInt(process.env.COGNITIVE_CYCLE_MS) || 5000;
const VISUAL_PERCEPT_INTERVAL_MS = parseInt(process.env.VISUAL_PERCEPT_INTERVAL_MS) || 3000;
const AUDIO_PERCEPT_MIN_MS = parseInt(process.env.AUDIO_PERCEPT_MIN_MS) || 7000;
const AUDIO_PERCEPT_MAX_MS = parseInt(process.env.AUDIO_PERCEPT_MAX_MS) || 10000;

// State (in-memory only for MVP)
const perceptBuffer = [];
let previousEmotionalState = null;
let cycleCount = 0;

/**
 * Format emotional plan for console display
 */
function displayEmotionalPlan(plan, cycleNum) {
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`🧠 COGNITIVE RESPONSE - CYCLE #${cycleNum}`);
  console.log(`${'═'.repeat(70)}`);
  console.log(`🏢 Operational State: ${plan.operational_state}`);
  console.log(`🎯 Current Focus: ${plan.current_focus?.primary || 'monitoring'} - ${plan.current_focus?.detail || 'general'}`);
  
  if (plan.visitor_observation?.what_i_see) {
    console.log(`👁️  Visitor: ${plan.visitor_observation.what_i_see}`);
    if (plan.visitor_observation.my_response) {
      console.log(`💭 Response: ${plan.visitor_observation.my_response}`);
    }
  }
  
  if (plan.building_status?.systems_on_mind && plan.building_status.systems_on_mind.length > 0) {
    console.log(`⚙️  Systems: ${plan.building_status.systems_on_mind.join(', ')}`);
  }
  
  console.log(`\n📝 Expression:`);
  console.log(`   ${plan.expression}`);
  
  if (plan.mood_vector) {
    console.log(`\n📈 Mood: valence=${plan.mood_vector.valence.toFixed(2)}, arousal=${plan.mood_vector.arousal.toFixed(2)}`);
  }
  
  console.log(`${'═'.repeat(70)}`);
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
    console.log(`   👁️  Visual: ${percept.emoji} ${percept.action}`);
  }
}, VISUAL_PERCEPT_INTERVAL_MS);

/**
 * Audio Percept Generation Loop
 * Simulates microphone percepts arriving at random intervals (7-10s)
 * Uses setTimeout with random delay to create natural speech cadence
 */
function scheduleNextAudioPercept() {
  // Random delay between min and max
  const delay = AUDIO_PERCEPT_MIN_MS + 
    Math.random() * (AUDIO_PERCEPT_MAX_MS - AUDIO_PERCEPT_MIN_MS);
  
  setTimeout(() => {
    const percept = generateAudioPercept();
    perceptBuffer.push(percept);
    
    // Only log meaningful audio (not silence)
    if (percept.transcript) {
      console.log(`\n   🎤 Audio: ${percept.emoji}`);
      console.log(`      "${percept.transcript}"`);
    } else if (percept.analysis !== "Silence" && percept.analysis !== "Silence - visitor observing quietly") {
      console.log(`\n   🎤 Audio: ${percept.emoji} ${percept.analysis}`);
    }
    
    // Schedule the next audio percept
    scheduleNextAudioPercept();
  }, delay);
}

// Start audio percept loop
scheduleNextAudioPercept();

/**
 * Core Cognitive Loop
 * Runs every 5 seconds - the robot's deliberative "heartbeat"
 */
setInterval(async () => {
  cycleCount++;
  
  // Step 1: Snapshot current percepts and clear queue
  // This ensures we process exactly what's in the queue RIGHT NOW
  // and start fresh collection for the next cycle
  const perceptsForThisCycle = [...perceptBuffer];
  perceptBuffer.length = 0;  // Clear queue - fresh collection starts immediately
  
  // Step 2: Create summary from our snapshot
  const perceptSummary = summarizePercepts(perceptsForThisCycle);
  
  // Display INPUT - what we're processing this cycle
  console.log(`\n\n${'━'.repeat(70)}`);
  console.log(`📥 INPUT TO CYCLE #${cycleCount}`);
  console.log(`${'━'.repeat(70)}`);
  console.log(`📊 Percepts in queue: ${perceptSummary.visualCount} visual, ${perceptSummary.audioCount} audio (${perceptSummary.activeVisualCount} + ${perceptSummary.activeAudioCount} active)`);
  console.log(`📝 Summary: ${perceptSummary.summary}`);
  console.log(`${'─'.repeat(70)}`);
  
  // Step 3: Send to LLM (new percepts collecting in background)
  try {
    const startTime = Date.now();
    const emotionalPlan = await generateEmotionalPlan(
      perceptSummary.summary,
      previousEmotionalState
    );
    const latency = Date.now() - startTime;
    
    // Step 4: Display OUTPUT - the cognitive response
    // This response corresponds exactly to the INPUT we just showed
    displayEmotionalPlan(emotionalPlan, cycleCount);
    console.log(`⏱️  Processing time: ${latency}ms`);
    console.log(`${'━'.repeat(70)}\n`);
    
    // Step 5: Update state for next cycle
    previousEmotionalState = emotionalPlan;
    
  } catch (error) {
    console.error(`\n❌ Cycle #${cycleNum} failed:`, error.message);
    console.log(`${'━'.repeat(70)}\n`);
  }
  
}, COGNITIVE_CYCLE_MS);

// Startup message
console.log('╔═══════════════════════════════════════════════════════════╗');
console.log('║         MVP Cognizer-1: Core Cognitive Loop              ║');
console.log('╚═══════════════════════════════════════════════════════════╝');
console.log('');
console.log('🚀 Cognitive loop started');
console.log(`⏰ Cycle interval: ${COGNITIVE_CYCLE_MS}ms (${COGNITIVE_CYCLE_MS/1000}s)`);
console.log(`👁️  Visual percept interval: ${VISUAL_PERCEPT_INTERVAL_MS}ms (every ${VISUAL_PERCEPT_INTERVAL_MS/1000}s)`);
console.log(`🎤 Audio percept interval: ${AUDIO_PERCEPT_MIN_MS}-${AUDIO_PERCEPT_MAX_MS}ms (every ${AUDIO_PERCEPT_MIN_MS/1000}-${AUDIO_PERCEPT_MAX_MS/1000}s, random)`);
console.log('');
console.log('Press Ctrl+C to stop');
console.log('');

