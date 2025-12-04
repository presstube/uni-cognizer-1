/**
 * Sigil API Endpoints
 * REST API for accessing sigil data in multiple formats
 */

import { getMindMomentWithFullSigil, getMindMomentSDF, getMindMomentSVG } from '../db/mind-moments.js';

/**
 * Register sigil API routes
 * @param {Express} app - Express application
 */
export function registerSigilAPI(app) {
  
  /**
   * GET /api/sigils/:momentId/svg
   * Returns SVG as image/svg+xml
   */
  app.get('/api/sigils/:momentId/svg', async (req, res) => {
    try {
      const svg = await getMindMomentSVG(req.params.momentId);
      
      if (!svg) {
        return res.status(404).json({ error: 'SVG not found' });
      }
      
      res.setHeader('Content-Type', 'image/svg+xml');
      res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
      res.send(svg);
    } catch (error) {
      console.error('Error fetching SVG:', error);
      res.status(500).json({ error: error.message });
    }
  });
  
  /**
   * GET /api/sigils/:momentId/sdf
   * Returns SDF as JSON with base64-encoded data
   */
  app.get('/api/sigils/:momentId/sdf', async (req, res) => {
    try {
      const sdf = await getMindMomentSDF(req.params.momentId);
      
      if (!sdf || !sdf.sigil_sdf_data) {
        return res.status(404).json({ error: 'SDF not found' });
      }
      
      res.json({
        width: sdf.sigil_sdf_width,
        height: sdf.sigil_sdf_height,
        data: Buffer.from(sdf.sigil_sdf_data).toString('base64')
      });
    } catch (error) {
      console.error('Error fetching SDF:', error);
      res.status(500).json({ error: error.message });
    }
  });
  
  /**
   * GET /api/sigils/:momentId/sdf/raw
   * Returns raw SDF as PNG image
   */
  app.get('/api/sigils/:momentId/sdf/raw', async (req, res) => {
    try {
      const sdf = await getMindMomentSDF(req.params.momentId);
      
      if (!sdf || !sdf.sigil_sdf_data) {
        return res.status(404).json({ error: 'SDF not found' });
      }
      
      // Ensure we're working with a Buffer (PostgreSQL BYTEA returns Buffer)
      const pngBuffer = Buffer.isBuffer(sdf.sigil_sdf_data) 
        ? sdf.sigil_sdf_data 
        : Buffer.from(sdf.sigil_sdf_data);
      
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Content-Length', pngBuffer.length.toString());
      res.setHeader('Content-Disposition', 'inline; filename="sigil.png"');
      res.setHeader('X-SDF-Width', sdf.sigil_sdf_width.toString());
      res.setHeader('X-SDF-Height', sdf.sigil_sdf_height.toString());
      res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
      
      // Send raw binary data (not JSON)
      res.end(pngBuffer, 'binary');
    } catch (error) {
      console.error('Error fetching raw SDF:', error);
      res.status(500).json({ error: error.message });
    }
  });
  
  /**
   * GET /api/sigils/:momentId/png
   * Returns PNG metadata as JSON
   */
  app.get('/api/sigils/:momentId/png', async (req, res) => {
    try {
      const { getPool } = await import('../db/index.js');
      const pool = getPool();
      
      const result = await pool.query(
        `SELECT cycle, sigil_png_data, sigil_png_width, sigil_png_height 
         FROM mind_moments 
         WHERE id = $1`,
        [req.params.momentId]
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Mind moment not found' });
      }
      
      const row = result.rows[0];
      
      res.json({
        cycle: row.cycle,
        available: !!row.sigil_png_data,
        width: row.sigil_png_width,
        height: row.sigil_png_height
      });
    } catch (error) {
      console.error('Error fetching PNG metadata:', error);
      res.status(500).json({ error: error.message });
    }
  });
  
  /**
   * GET /api/sigils/:momentId/png/raw
   * Returns raw PNG image
   */
  app.get('/api/sigils/:momentId/png/raw', async (req, res) => {
    try {
      const { getPool } = await import('../db/index.js');
      const pool = getPool();
      
      const result = await pool.query(
        `SELECT sigil_png_data, sigil_png_width, sigil_png_height 
         FROM mind_moments 
         WHERE id = $1`,
        [req.params.momentId]
      );
      
      if (result.rows.length === 0 || !result.rows[0].sigil_png_data) {
        return res.status(404).json({ error: 'PNG not found' });
      }
      
      const row = result.rows[0];
      const pngBuffer = Buffer.isBuffer(row.sigil_png_data) 
        ? row.sigil_png_data 
        : Buffer.from(row.sigil_png_data);
      
      // Generate ETag from buffer hash for cache invalidation when PNG changes
      const crypto = await import('crypto');
      const etag = crypto.createHash('md5').update(pngBuffer).digest('hex');
      
      // Check if client has cached version
      if (req.headers['if-none-match'] === etag) {
        return res.status(304).end();
      }
      
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Content-Length', pngBuffer.length.toString());
      res.setHeader('Content-Disposition', 'inline; filename="sigil.png"');
      res.setHeader('X-PNG-Width', row.sigil_png_width.toString());
      res.setHeader('X-PNG-Height', row.sigil_png_height.toString());
      res.setHeader('ETag', etag);
      res.setHeader('Cache-Control', 'public, max-age=3600'); // 1 hour cache, ETag will handle updates
      
      res.end(pngBuffer, 'binary');
    } catch (error) {
      console.error('Error fetching raw PNG:', error);
      res.status(500).json({ error: error.message });
    }
  });
  
  /**
   * GET /api/sigils/:momentId/all
   * Returns all sigil formats (code, SVG, SDF, PNG metadata)
   */
  app.get('/api/sigils/:momentId/all', async (req, res) => {
    try {
      const moment = await getMindMomentWithFullSigil(req.params.momentId);
      
      if (!moment) {
        return res.status(404).json({ error: 'Mind moment not found' });
      }
      
      res.json({
        id: moment.id,
        cycle: moment.cycle,
        sigilPhrase: moment.sigil_phrase,
        sigilCode: moment.sigil_code,
        sigilSVG: moment.sigil_svg,
        sdf: moment.sigil_sdf_data ? {
          width: moment.sigil_sdf_width,
          height: moment.sigil_sdf_height,
          dataSize: moment.sigil_sdf_data.length,
          available: true
        } : null,
        png: moment.sigil_png_data ? {
          width: moment.sigil_png_width,
          height: moment.sigil_png_height,
          dataSize: moment.sigil_png_data.length,
          available: true
        } : null
      });
    } catch (error) {
      console.error('Error fetching sigil data:', error);
      res.status(500).json({ error: error.message });
    }
  });
}

