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
const audioPerceptsPath = join(__dirname, '../data/mock-audio-percepts-detailed.json');

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
 * Create summary from specific percept array
 * Pure function - formats percepts into readable summary
 * 
 * @param {Array} percepts - Array of percept objects to summarize
 * @returns {Object} Summary with counts and formatted text
 */
export function summarizePercepts(percepts) {
  if (percepts.length === 0) {
    return {
      count: 0,
      visualCount: 0,
      audioCount: 0,
      activeVisualCount: 0,
      activeAudioCount: 0,
      summary: "No percepts in queue"
    };
  }
  
  // Separate visual and audio percepts
  const visualPercepts = percepts.filter(p => p.type === 'visual');
  const audioPercepts = percepts.filter(p => p.type === 'audio');
  
  // Filter out inactive visual percepts (NOPE)
  const activeVisualPercepts = visualPercepts.filter(p => p.action !== "NOPE");
  
  // Filter out silence audio percepts
  const activeAudioPercepts = audioPercepts.filter(p => 
    p.transcript !== null && p.analysis !== "Silence" && p.analysis !== "Silence - visitor observing quietly"
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
    : "No significant activity";
  
  return {
    count: percepts.length,
    visualCount: visualPercepts.length,
    audioCount: audioPercepts.length,
    activeVisualCount: activeVisualPercepts.length,
    activeAudioCount: activeAudioPercepts.length,
    percepts: percepts,
    summary
  };
}

