/**
 * Mock Percept Generator
 * 
 * Generates simulated camera-style visual and microphone audio percepts
 * for testing the cognitive loop.
 * Pure function - no side effects.
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load percepts from JSON files
const visualPerceptsPath = join(__dirname, '../data/mock-visual-percepts-visitor.json');
const audioPerceptsPath = join(__dirname, '../data/mock-audio-percepts-2.json');

const VISUAL_PERCEPTS = JSON.parse(readFileSync(visualPerceptsPath, 'utf-8'));
const AUDIO_PERCEPTS = JSON.parse(readFileSync(audioPerceptsPath, 'utf-8'));

/**
 * Generate a random visual percept
 * Uses weighted random selection for more realistic percept distribution
 * Camera-style percepts: action description + emoji
 * 
 * @returns {Object} Visual percept object with timestamp, action, emoji
 */
export function generateVisualPercept() {
  const totalWeight = VISUAL_PERCEPTS.reduce((sum, p) => sum + p.weight, 0);
  let random = Math.random() * totalWeight;
  
  let selectedPercept = VISUAL_PERCEPTS[0];
  for (const percept of VISUAL_PERCEPTS) {
    random -= percept.weight;
    if (random <= 0) {
      selectedPercept = percept;
      break;
    }
  }
  
  return {
    timestamp: new Date().toISOString(),
    type: 'visual',
    action: selectedPercept.action,
    emoji: selectedPercept.emoji
  };
}

/**
 * Generate a random audio percept
 * Uses weighted random selection for more realistic percept distribution
 * Microphone-style percepts: transcript, analysis, tone, emoji, sentiment
 * 
 * @returns {Object} Audio percept object with full mic analysis
 */
export function generateAudioPercept() {
  const totalWeight = AUDIO_PERCEPTS.reduce((sum, p) => sum + p.weight, 0);
  let random = Math.random() * totalWeight;
  
  let selectedPercept = AUDIO_PERCEPTS[0];
  for (const percept of AUDIO_PERCEPTS) {
    random -= percept.weight;
    if (random <= 0) {
      selectedPercept = percept;
      break;
    }
  }
  
  return {
    timestamp: new Date().toISOString(),
    type: 'audio',
    transcript: selectedPercept.transcript,
    analysis: selectedPercept.analysis,
    tone: selectedPercept.tone,
    emoji: selectedPercept.emoji,
    sentiment: selectedPercept.sentiment,
    confidence: selectedPercept.confidence
  };
}

/**
 * Aggregate percepts from buffer within time window
 * Pure function - no mutations
 * Formats both visual and audio percepts into readable summary
 * 
 * @param {Array} perceptBuffer - Array of percept objects
 * @param {number} windowSeconds - Time window in seconds (default 5)
 * @returns {Object} Aggregated percept summary
 */
export function aggregatePercepts(perceptBuffer, windowSeconds = 5) {
  const now = Date.now();
  const cutoff = now - (windowSeconds * 1000);
  
  const recentPercepts = perceptBuffer.filter(p => 
    new Date(p.timestamp).getTime() > cutoff
  );
  
  if (recentPercepts.length === 0) {
    return {
      count: 0,
      percepts: [],
      summary: "No activity detected"
    };
  }
  
  // Separate visual and audio percepts
  const visualPercepts = recentPercepts.filter(p => p.type === 'visual');
  const audioPercepts = recentPercepts.filter(p => p.type === 'audio');
  
  // Filter out inactive visual percepts (NOPE)
  const activeVisualPercepts = visualPercepts.filter(p => p.action !== "NOPE");
  
  // Filter out silence audio percepts
  const activeAudioPercepts = audioPercepts.filter(p => 
    p.transcript !== null && p.analysis !== "Silence"
  );
  
  // Build summary
  const summaryParts = [];
  
  if (activeVisualPercepts.length > 0) {
    const visualSummary = activeVisualPercepts.map(p => 
      `${p.emoji} ${p.action}`
    ).join('; ');
    summaryParts.push(`Visual: ${visualSummary}`);
  } else if (visualPercepts.length > 0) {
    summaryParts.push('Visual: No significant activity');
  }
  
  if (activeAudioPercepts.length > 0) {
    const audioSummary = activeAudioPercepts.map(p => {
      if (p.transcript) {
        return `${p.emoji} "${p.transcript}" (${p.tone})`;
      } else {
        return `${p.emoji} ${p.analysis}`;
      }
    }).join('; ');
    summaryParts.push(`Audio: ${audioSummary}`);
  } else if (audioPercepts.length > 0) {
    summaryParts.push('Audio: Silence or ambient sounds');
  }
  
  const summary = summaryParts.length > 0 
    ? summaryParts.join(' | ') 
    : "No significant activity detected";
  
  return {
    count: recentPercepts.length,
    visualCount: visualPercepts.length,
    audioCount: audioPercepts.length,
    activeVisualCount: activeVisualPercepts.length,
    activeAudioCount: activeAudioPercepts.length,
    percepts: recentPercepts,
    summary
  };
}

