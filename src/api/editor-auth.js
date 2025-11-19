import express from 'express';

/**
 * Basic Auth Middleware for Prompt Editors
 * - Disabled locally (NODE_ENV !== 'production')
 * - Required in production with HTTP Basic Auth
 */
export function editorAuth(req, res, next) {
  // Skip auth in local development
  if (process.env.NODE_ENV !== 'production') {
    return next();
  }
  
  // In production, require authentication
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    res.setHeader('WWW-Authenticate', 'Basic realm="Prompt Editors"');
    return res.status(401).send('Authentication required');
  }
  
  // Parse credentials
  const base64Credentials = authHeader.split(' ')[1];
  const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');
  const [username, password] = credentials.split(':');
  
  // Check against env vars
  const validUsername = process.env.EDITOR_USERNAME || 'admin';
  const validPassword = process.env.EDITOR_PASSWORD;
  
  if (!validPassword) {
    console.error('⚠️  EDITOR_PASSWORD not set in production! Editors are unprotected!');
    return res.status(500).json({ 
      error: 'Server misconfigured - EDITOR_PASSWORD must be set in production' 
    });
  }
  
  if (username === validUsername && password === validPassword) {
    next();
  } else {
    res.setHeader('WWW-Authenticate', 'Basic realm="Prompt Editors"');
    res.status(401).send('Invalid credentials');
  }
}

