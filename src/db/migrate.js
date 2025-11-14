import 'dotenv/config';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { getPool, initDatabase } from './index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export async function runMigrations() {
  const pool = initDatabase();
  
  if (!pool) {
    console.log('⏭️  Skipping migrations (database disabled)');
    return;
  }
  
  console.log('🔄 Running database migrations...');
  
  try {
    // Check if migration already applied
    const checkResult = await pool.query(
      "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'schema_migrations')"
    );
    
    const tableExists = checkResult.rows[0].exists;
    
    if (tableExists) {
      const versionResult = await pool.query(
        'SELECT version FROM schema_migrations WHERE version = 1'
      );
      
      if (versionResult.rows.length > 0) {
        console.log('✓ Migration 001 already applied, skipping');
        console.log('✓ Database schema ready');
        return;
      }
    }
    
    // Read migration file
    const migrationPath = join(__dirname, 'migrations', '001_initial_schema.sql');
    const sql = readFileSync(migrationPath, 'utf-8');
    
    // Execute migration
    await pool.query(sql);
    
    console.log('✓ Migration 001_initial_schema.sql applied');
    console.log('✓ Database schema ready');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  }
}

// Allow running standalone: node src/db/migrate.js
if (import.meta.url === `file://${process.argv[1]}`) {
  await runMigrations();
  process.exit(0);
}

