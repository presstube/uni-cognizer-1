import { Router } from 'express';
import { GoogleGenAI } from '@google/genai';

const router = Router();

/**
 * Generate ephemeral Gemini token for client-side use
 * 
 * GET /api/gemini/token
 * 
 * Headers:
 *   x-password: Optional password (if TOKEN_PASSWORD env var is set)
 * 
 * Response:
 *   { token: string, expiresAt: string }
 * 
 * Use case: Allows aggregator-1 to use Gemini API without exposing key
 */
router.get('/gemini/token', async (req, res) => {
  try {
    // Optional password protection
    const providedPassword = req.headers['x-password'] || req.query.password;
    const correctPassword = process.env.TOKEN_PASSWORD;
    
    if (correctPassword && providedPassword !== correctPassword) {
      console.warn('⚠️  Invalid token password attempt');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Validate Gemini API key is configured
    if (!process.env.GEMINI_API_KEY) {
      console.error('❌ GEMINI_API_KEY not configured');
      return res.status(500).json({ 
        error: 'Gemini API key not configured' 
      });
    }

    // Create Gemini client (using @google/genai for token generation)
    const client = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY
    });

    // Calculate expiry time (30 minutes)
    const expireTime = new Date(Date.now() + 30 * 60 * 1000);
    
    // Generate ephemeral token
    const token = await client.authTokens.create({
      config: {
        uses: 1,
        expireTime: expireTime.toISOString(),
        newSessionExpireTime: new Date(Date.now() + 60 * 1000).toISOString(),
        httpOptions: { apiVersion: 'v1alpha' }
      }
    });

    console.log(`✓ Generated ephemeral token (expires: ${expireTime.toISOString()})`);

    res.json({ 
      token: token.name,
      expiresAt: expireTime.toISOString()
    });

  } catch (error) {
    console.error('❌ Token generation error:', error);
    res.status(500).json({ 
      error: 'Failed to generate token',
      message: error.message 
    });
  }
});

export default router;

