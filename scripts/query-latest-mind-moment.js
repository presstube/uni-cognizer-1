#!/usr/bin/env node
/**
 * Query Latest Mind Moment with Sound Brief
 * Fetches the latest mind moment from DB and writes it to markdown
 */

import 'dotenv/config';
import { initDatabase, getPool, closeDatabase } from '../src/db/index.js';
import fs from 'fs/promises';
import path from 'path';

async function queryLatestMindMoment() {
  try {
    // Initialize database connection
    initDatabase();
    
    if (!process.env.DATABASE_URL) {
      console.log('⚠️  DATABASE_URL not set - cannot query database');
      process.exit(1);
    }
    
    const pool = getPool();
    
    // Query latest mind moment with all fields including sound_brief
    const result = await pool.query(`
      SELECT 
        id, cycle, session_id, mind_moment, sigil_phrase,
        sigil_code, sigil_svg, 
        sigil_sdf_data, sigil_sdf_width, sigil_sdf_height,
        sigil_png_data, sigil_png_width, sigil_png_height,
        circumplex, visual_percepts, audio_percepts,
        prior_moment_ids, sound_brief,
        cognizer_version, personality_id, llm_provider,
        processing_duration_ms, created_at
      FROM mind_moments 
      ORDER BY created_at DESC
      LIMIT 1
    `);
    
    if (result.rows.length === 0) {
      console.log('❌ No mind moments found in database');
      return;
    }
    
    const moment = result.rows[0];
    
    // Build markdown content
    let markdown = `# Latest Mind Moment\n\n`;
    markdown += `**Generated:** ${moment.created_at}\n\n`;
    markdown += `---\n\n`;
    
    // Basic Info
    markdown += `## Basic Information\n\n`;
    markdown += `- **ID:** \`${moment.id}\`\n`;
    markdown += `- **Cycle:** ${moment.cycle}\n`;
    markdown += `- **Session ID:** \`${moment.session_id}\`\n`;
    markdown += `- **Cognizer Version:** ${moment.cognizer_version}\n`;
    markdown += `- **Personality ID:** \`${moment.personality_id}\`\n`;
    markdown += `- **LLM Provider:** ${moment.llm_provider}\n`;
    markdown += `- **Processing Duration:** ${moment.processing_duration_ms}ms\n\n`;
    
    // Mind Moment
    markdown += `## Mind Moment\n\n`;
    markdown += `${moment.mind_moment}\n\n`;
    
    // Sigil Phrase
    markdown += `## Sigil Phrase\n\n`;
    markdown += `> ${moment.sigil_phrase}\n\n`;
    
    // Circumplex
    markdown += `## Circumplex (Emotional State)\n\n`;
    const circumplex = typeof moment.circumplex === 'string' 
      ? JSON.parse(moment.circumplex) 
      : moment.circumplex;
    markdown += `- **Valence:** ${circumplex.valence} (${circumplex.valence > 0 ? 'Positive' : 'Negative'})\n`;
    markdown += `- **Arousal:** ${circumplex.arousal} (${circumplex.arousal > 0 ? 'High Energy' : 'Low Energy'})\n\n`;
    
    // Visual Percepts
    markdown += `## Visual Percepts\n\n`;
    const visualPercepts = typeof moment.visual_percepts === 'string'
      ? JSON.parse(moment.visual_percepts)
      : moment.visual_percepts;
    if (visualPercepts && visualPercepts.length > 0) {
      visualPercepts.forEach((percept, i) => {
        markdown += `### Percept ${i + 1}\n\n`;
        markdown += `- **Title:** ${percept.title || 'N/A'}\n`;
        markdown += `- **Description:** ${percept.description || 'N/A'}\n\n`;
      });
    } else {
      markdown += `*No visual percepts*\n\n`;
    }
    
    // Audio Percepts
    markdown += `## Audio Percepts\n\n`;
    const audioPercepts = typeof moment.audio_percepts === 'string'
      ? JSON.parse(moment.audio_percepts)
      : moment.audio_percepts;
    if (audioPercepts && audioPercepts.length > 0) {
      audioPercepts.forEach((percept, i) => {
        markdown += `### Percept ${i + 1}\n\n`;
        markdown += `- **Title:** ${percept.title || 'N/A'}\n`;
        markdown += `- **Description:** ${percept.description || 'N/A'}\n\n`;
      });
    } else {
      markdown += `*No audio percepts*\n\n`;
    }
    
    // Sigil Code
    markdown += `## Sigil Code\n\n`;
    if (moment.sigil_code) {
      markdown += `\`\`\`javascript\n${moment.sigil_code}\n\`\`\`\n\n`;
    } else {
      markdown += `*No sigil code generated*\n\n`;
    }
    
    // Sigil SVG
    markdown += `## Sigil SVG\n\n`;
    if (moment.sigil_svg) {
      markdown += `<details>\n<summary>Click to view SVG</summary>\n\n`;
      markdown += `\`\`\`xml\n${moment.sigil_svg}\n\`\`\`\n\n`;
      markdown += `</details>\n\n`;
    } else {
      markdown += `*No SVG generated*\n\n`;
    }
    
    // Sigil SDF
    markdown += `## Sigil SDF\n\n`;
    if (moment.sigil_sdf_data) {
      markdown += `- **Width:** ${moment.sigil_sdf_width}\n`;
      markdown += `- **Height:** ${moment.sigil_sdf_height}\n`;
      markdown += `- **Data Length:** ${moment.sigil_sdf_data.length} bytes\n\n`;
    } else {
      markdown += `*No SDF data generated*\n\n`;
    }
    
    // Sigil PNG
    markdown += `## Sigil PNG\n\n`;
    if (moment.sigil_png_data) {
      markdown += `- **Width:** ${moment.sigil_png_width}\n`;
      markdown += `- **Height:** ${moment.sigil_png_height}\n`;
      markdown += `- **Data Length:** ${moment.sigil_png_data.length} bytes\n\n`;
    } else {
      markdown += `*No PNG data generated*\n\n`;
    }
    
    // Sound Brief - THE MAIN FEATURE
    markdown += `## Sound Brief\n\n`;
    if (moment.sound_brief) {
      const soundBrief = typeof moment.sound_brief === 'string'
        ? JSON.parse(moment.sound_brief)
        : moment.sound_brief;
      
      // Reasoning
      if (soundBrief.reasoning) {
        markdown += `### Reasoning\n\n`;
        markdown += `${soundBrief.reasoning}\n\n`;
      }
      
      // Selections
      if (soundBrief.selections) {
        markdown += `### Selections\n\n`;
        const sel = soundBrief.selections;
        
        markdown += `#### Audio Files\n\n`;
        markdown += `- **Music:** \`${sel.music_filename || 'N/A'}\`\n`;
        markdown += `- **Texture:** \`${sel.texture_filename || 'N/A'}\`\n\n`;
        
        markdown += `#### Bass Configuration\n\n`;
        markdown += `- **Preset:** \`${sel.bass_preset || 'N/A'}\`\n`;
        markdown += `- **Speed:** ${sel.bass_speed !== undefined ? sel.bass_speed : 'N/A'}\n`;
        markdown += `- **Stability:** ${sel.bass_stability !== undefined ? sel.bass_stability : 'N/A'}\n`;
        markdown += `- **Coloration:** ${sel.bass_coloration !== undefined ? sel.bass_coloration : 'N/A'}\n`;
        markdown += `- **Scale:** ${sel.bass_scale !== undefined ? sel.bass_scale : 'N/A'} (${sel.bass_scale < 0.5 ? 'Minor' : 'Major'})\n\n`;
        
        markdown += `#### Melody Configuration\n\n`;
        markdown += `- **Speed:** ${sel.melody_speed !== undefined ? sel.melody_speed : 'N/A'}\n`;
        markdown += `- **Stability:** ${sel.melody_stability !== undefined ? sel.melody_stability : 'N/A'}\n`;
        markdown += `- **Coloration:** ${sel.melody_coloration !== undefined ? sel.melody_coloration : 'N/A'}\n`;
        markdown += `- **Scale:** ${sel.melody_scale !== undefined ? sel.melody_scale : 'N/A'} (${sel.melody_scale < 0.5 ? 'Minor' : 'Major'})\n\n`;
      }
      
      // Sample Metadata (try both camelCase and snake_case)
      const musicSample = soundBrief.music_sample || soundBrief.musicSample;
      if (musicSample) {
        markdown += `### Music Sample Details\n\n`;
        markdown += `- **Filename:** \`${musicSample.filename || 'N/A'}\`\n`;
        markdown += `- **Description:** ${musicSample.description || 'N/A'}\n`;
        markdown += `- **Tone:** ${musicSample.tone || 'N/A'}\n`;
        markdown += `- **Density:** ${musicSample.density || 'N/A'}\n`;
        markdown += `- **Mood:** ${musicSample.mood || 'N/A'}\n`;
        markdown += `- **Scale:** ${musicSample.scale || 'N/A'}\n`;
        markdown += `- **Rhythm:** ${musicSample.rhythm || 'N/A'}\n\n`;
      }
      
      const textureSample = soundBrief.texture_sample || soundBrief.textureSample;
      if (textureSample) {
        markdown += `### Texture Sample Details\n\n`;
        markdown += `- **Filename:** \`${textureSample.filename || 'N/A'}\`\n`;
        markdown += `- **Description:** ${textureSample.description || 'N/A'}\n`;
        markdown += `- **Tone:** ${textureSample.tone || 'N/A'}\n`;
        markdown += `- **Density:** ${textureSample.density || 'N/A'}\n`;
        markdown += `- **Mood:** ${textureSample.mood || 'N/A'}\n`;
        markdown += `- **Category:** ${textureSample.category || 'N/A'}\n\n`;
      }
      
      // Raw JSON
      markdown += `### Raw Sound Brief JSON\n\n`;
      markdown += `<details>\n<summary>Click to view raw JSON</summary>\n\n`;
      markdown += `\`\`\`json\n${JSON.stringify(soundBrief, null, 2)}\n\`\`\`\n\n`;
      markdown += `</details>\n\n`;
    } else {
      markdown += `*No sound brief generated*\n\n`;
    }
    
    // Prior Moments
    markdown += `## Prior Moment IDs\n\n`;
    if (moment.prior_moment_ids && moment.prior_moment_ids.length > 0) {
      moment.prior_moment_ids.forEach(id => {
        markdown += `- \`${id}\`\n`;
      });
      markdown += `\n`;
    } else {
      markdown += `*No prior moments*\n\n`;
    }
    
    // Write to file
    const outputPath = path.join(process.cwd(), 'docs', 'LATEST_MIND_MOMENT.md');
    await fs.writeFile(outputPath, markdown, 'utf-8');
    
    console.log(`✅ Latest mind moment written to: ${outputPath}`);
    console.log(`📊 Cycle: ${moment.cycle}`);
    console.log(`🎨 Sigil Phrase: ${moment.sigil_phrase}`);
    console.log(`🔊 Sound Brief: ${moment.sound_brief ? 'YES' : 'NO'}`);
    
    // Close database
    await closeDatabase();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the query
queryLatestMindMoment();
