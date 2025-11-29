import { Router } from 'express';
import * as personalities from '../db/personalities.js';
import { callLLM } from '../providers/index.js';
import { callLLMDynamic } from '../providers/dynamic.js';

const router = Router();

// List all personalities (summary only, no full prompts)
router.get('/personalities', async (req, res) => {
  try {
    const list = await personalities.listPersonalities();
    res.json({ personalities: list });
  } catch (error) {
    console.error('GET /personalities error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get currently active personality
router.get('/personalities/active', async (req, res) => {
  try {
    const personality = await personalities.getActivePersonality();
    
    if (!personality) {
      return res.status(404).json({ error: 'No active personality found' });
    }
    
    res.json({ personality });
  } catch (error) {
    console.error('GET /personalities/active error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get specific personality by ID (includes full prompt)
router.get('/personalities/:id', async (req, res) => {
  try {
    const personality = await personalities.getFullPersonality(req.params.id);
    
    if (!personality) {
      return res.status(404).json({ error: 'Personality not found' });
    }
    
    res.json({ personality });
  } catch (error) {
    console.error(`GET /personalities/${req.params.id} error:`, error);
    res.status(500).json({ error: error.message });
  }
});

// Create or update personality
router.post('/personalities', async (req, res) => {
  try {
    const { 
      id, name, slug, prompt,
      provider, model, temperature, top_p, top_k, max_tokens
    } = req.body;
    
    // Validation
    if (!name || !slug || !prompt) {
      return res.status(400).json({ 
        error: 'Missing required fields: name, slug, prompt' 
      });
    }
    
    if (slug.length > 100) {
      return res.status(400).json({ error: 'Slug too long (max 100 chars)' });
    }
    
    if (name.length > 200) {
      return res.status(400).json({ error: 'Name too long (max 200 chars)' });
    }
    
    const personality = await personalities.savePersonality({
      id, name, slug, prompt,
      provider, model, temperature, top_p, top_k, max_tokens
    });
    
    res.json({ personality });
  } catch (error) {
    console.error('POST /personalities error:', error);
    
    // Handle unique constraint violation
    if (error.constraint === 'personalities_slug_key') {
      return res.status(409).json({ error: 'Slug already exists' });
    }
    
    res.status(500).json({ error: error.message });
  }
});

// Activate a personality
router.post('/personalities/:id/activate', async (req, res) => {
  try {
    const personality = await personalities.activatePersonality(req.params.id);
    
    console.log(`🎭 Activated personality: ${personality.name}`);
    
    res.json({ 
      personality,
      message: 'Personality activated. Restart server to load new personality.' 
    });
  } catch (error) {
    console.error(`POST /personalities/${req.params.id}/activate error:`, error);
    
    if (error.message === 'Personality not found') {
      return res.status(404).json({ error: 'Personality not found' });
    }
    
    res.status(500).json({ error: error.message });
  }
});

// Test personality with mock percepts
router.post('/personalities/:id/test', async (req, res) => {
  try {
    const personality = await personalities.getFullPersonality(req.params.id);
    
    if (!personality) {
      return res.status(404).json({ error: 'Personality not found' });
    }
    
    const { visualPercepts = [], audioPercepts = [], llmSettings = null } = req.body;
    
    // Build prompt with personality
    const visualStr = visualPercepts
      .map(p => `${p.emoji || ''} ${p.action || ''}`.trim())
      .filter(Boolean)
      .join('; ') || '(none)';
      
    const audioStr = audioPercepts
      .map(p => {
        if (p.transcript) return `"${p.transcript}"`;
        return p.analysis || '';
      })
      .filter(Boolean)
      .join('; ') || '(none)';
    
    const prompt = `${personality.prompt}

CURRENT PERCEPTS:
Visual: ${visualStr}
Audio: ${audioStr}

Generate a complete cognitive response as JSON. Be specific about what you notice.

Respond with ONLY valid JSON, nothing else.`;
    
    // Use LLM settings from request if provided (UI override), otherwise use saved personality settings
    const effectiveSettings = llmSettings || {
      provider: personality.provider || 'gemini',
      model: personality.model || 'gemini-2.0-flash-exp',
      temperature: personality.temperature ?? 0.7,
      maxTokens: personality.max_tokens || 1024,
      topP: personality.top_p ?? 0.9,
      topK: personality.top_k ?? 40
    };
    
    // Build config from effective LLM settings
    const llmConfig = {
      provider: effectiveSettings.provider,
      model: effectiveSettings.model,
      temperature: parseFloat(effectiveSettings.temperature),
      maxTokens: parseInt(effectiveSettings.maxTokens || effectiveSettings.max_tokens, 10),
      topP: parseFloat(effectiveSettings.topP || effectiveSettings.top_p),
      topK: parseInt(effectiveSettings.topK || effectiveSettings.top_k, 10)
    };
    
    console.log(`🧪 Testing personality: ${personality.name}`);
    console.log(`   LLM: ${llmConfig.provider}/${llmConfig.model} (temp: ${llmConfig.temperature})`);
    if (llmSettings) {
      console.log(`   Using UI settings (not saved)`);
      console.log(`   Full config:`, JSON.stringify(llmConfig, null, 2));
    }
    
    // Call LLM with effective provider and settings
    const response = await callLLMDynamic(prompt, llmConfig);
    const text = response.trim();
    
    // Parse response
    let jsonText = text;
    if (text.includes('```json')) {
      jsonText = text.match(/```json\s*([\s\S]*?)\s*```/)?.[1] || text;
    } else if (text.includes('```')) {
      jsonText = text.match(/```\s*([\s\S]*?)\s*```/)?.[1] || text;
    }
    
    const parsed = JSON.parse(jsonText.trim());
    
    res.json({
      mindMoment: parsed.mindMoment || parsed.mind_moment || '',
      sigilPhrase: parsed.sigilPhrase || parsed.sigil_phrase || null,
      kinetic: parsed.kinetic || { pattern: 'IDLE' },
      lighting: parsed.lighting || { color: '0xffffff', pattern: 'IDLE', speed: 0 }
    });
    
  } catch (error) {
    console.error(`POST /personalities/${req.params.id}/test error:`, error);
    
    if (error.message === 'Personality not found') {
      return res.status(404).json({ error: 'Personality not found' });
    }
    
    // LLM or parsing error
    res.status(500).json({ 
      error: 'Test failed',
      details: error.message 
    });
  }
});

// Delete personality
router.delete('/personalities/:id', async (req, res) => {
  try {
    await personalities.deletePersonality(req.params.id);
    
    res.json({ 
      success: true,
      message: 'Personality deleted' 
    });
  } catch (error) {
    console.error(`DELETE /personalities/${req.params.id} error:`, error);
    
    if (error.message.includes('Cannot delete active')) {
      return res.status(400).json({ error: error.message });
    }
    
    res.status(500).json({ error: error.message });
  }
});

export default router;

