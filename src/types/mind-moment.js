/**
 * Mind Moment Type Definition
 * 
 * Standard structure used by both live cognition and dream replay.
 * Ensures consistency across the entire consciousness system.
 */

/**
 * @typedef {Object} MindMoment
 * @property {number} cycle - Cycle number
 * @property {string} mindMoment - The cognitive observation/reflection
 * @property {string} sigilPhrase - Essence phrase for visualization
 * @property {string|null} sigilCode - Canvas drawing code for sigil
 * @property {Object} circumplex - Emotional state (valence and arousal axes)
 * @property {Array} visualPercepts - Array of visual percept objects
 * @property {Array} audioPercepts - Array of audio percept objects
 * @property {Array} priorMoments - Array of prior moment references
 * @property {Object|null} sdf - Signed distance field data (optional)
 * @property {Object|null} png - PNG image data (optional)
 * @property {Object|null} soundBrief - Sound generation result (optional)
 * @property {boolean} isDream - Whether this is a dream (replayed) moment
 * @property {string} timestamp - ISO timestamp of emission
 */

/**
 * Validate mind moment structure
 * @param {Object} moment - Mind moment to validate
 * @returns {boolean} True if valid structure
 */
export function validateMindMoment(moment) {
  const required = ['cycle', 'mindMoment', 'sigilPhrase', 'circumplex'];
  const hasRequired = required.every(field => moment[field] !== undefined);
  
  if (!hasRequired) {
    console.warn('[MindMoment] Missing required fields:', 
      required.filter(f => moment[f] === undefined));
    return false;
  }
  
  return true;
}

/**
 * Create a normalized mind moment structure
 * @param {Object} data - Raw data to normalize
 * @returns {MindMoment} Normalized mind moment
 */
export function normalizeMindMoment(data) {
  return {
    cycle: data.cycle,
    mindMoment: data.mindMoment || data.mind_moment,
    sigilPhrase: data.sigilPhrase || data.sigil_phrase,
    sigilCode: data.sigilCode || data.sigil_code || null,
    circumplex: data.circumplex || { valence: 0, arousal: 0 },
    visualPercepts: data.visualPercepts || data.visual_percepts || [],
    audioPercepts: data.audioPercepts || data.audio_percepts || [],
    priorMoments: data.priorMoments || data.prior_moments || data.priorMomentIds || data.prior_moment_ids || [],
    sdf: data.sdf || null,
    png: data.png || null,
    soundBrief: data.soundBrief || data.sound_brief || null,
    isDream: data.isDream || false,
    timestamp: data.timestamp || new Date().toISOString()
  };
}

/**
 * Check if mind moment is complete (has sigil)
 * @param {MindMoment} moment - Mind moment to check
 * @returns {boolean} True if complete
 */
export function isCompleteMindMoment(moment) {
  return moment.sigilCode !== null && moment.sigilCode !== undefined;
}

