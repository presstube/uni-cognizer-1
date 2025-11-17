import express from 'express';

/**
 * Basic Auth Middleware for Forge
 * Simplest password protection - good enough for internal tool
 */
export function forgeAuth(req, res, next) {
  // Skip auth if disabled
  if (process.env.FORGE_AUTH_ENABLED !== 'true') {
    return next();
  }
  
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    res.setHeader('WWW-Authenticate', 'Basic realm="Personality Forge"');
    return res.status(401).send('Authentication required');
  }
  
  // Parse credentials
  const base64Credentials = authHeader.split(' ')[1];
  const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');
  const [username, password] = credentials.split(':');
  
  // Check against env vars
  const validUsername = process.env.FORGE_USERNAME || 'admin';
  const validPassword = process.env.FORGE_PASSWORD;
  
  if (!validPassword) {
    console.error('⚠️  FORGE_PASSWORD not set! Forge is unprotected!');
    return next();
  }
  
  if (username === validUsername && password === validPassword) {
    next();
  } else {
    res.setHeader('WWW-Authenticate', 'Basic realm="Personality Forge"');
    res.status(401).send('Invalid credentials');
  }
}

