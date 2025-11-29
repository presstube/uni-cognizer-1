import pkg from 'pg';
const { Pool } = pkg;

let pool = null;

export function initDatabase() {
  if (!process.env.DATABASE_URL) {
    console.warn('⚠️  DATABASE_URL not set - database features disabled');
    return null;
  }
  
  if (pool) return pool;
  
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' || process.env.DATABASE_URL.includes('render.com') 
      ? { rejectUnauthorized: false } 
      : false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000  // Increased from 2s to 10s for remote databases
  });
  
  pool.on('error', (err) => {
    console.error('Unexpected database error:', err);
  });
  
  console.log('✓ Database connection pool initialized');
  return pool;
}

export function getPool() {
  if (!pool) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return pool;
}

export async function healthCheck() {
  try {
    const result = await pool.query('SELECT NOW()');
    return { healthy: true, timestamp: result.rows[0].now };
  } catch (error) {
    return { healthy: false, error: error.message };
  }
}

export async function closeDatabase() {
  if (pool) {
    await pool.end();
    pool = null;
    console.log('✓ Database connection pool closed');
  }
}

