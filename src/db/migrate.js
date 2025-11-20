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
  
  // List of migrations in order
  const migrations = [
    '001_initial_schema.sql',
    '002_personalities.sql',
    '003_sigil_prompts.sql',
    '004_visual_prompts.sql',
    '005_add_llm_settings_to_sigil_prompts.sql'
  ];
  
  try {
    // Check if schema_migrations table exists
    const checkResult = await pool.query(
      "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'schema_migrations')"
    );
    
    const tableExists = checkResult.rows[0].exists;
    
    // Get applied migrations
    let appliedVersions = [];
    if (tableExists) {
      const result = await pool.query('SELECT version FROM schema_migrations ORDER BY version');
      appliedVersions = result.rows.map(r => r.version);
    }
    
    // Run each migration if not already applied
    for (let i = 0; i < migrations.length; i++) {
      const version = i + 1;
      const migrationFile = migrations[i];
      
      if (appliedVersions.includes(version)) {
        console.log(`✓ Migration ${version} (${migrationFile}) already applied`);
        continue;
      }
      
      // Read and execute migration
      const migrationPath = join(__dirname, 'migrations', migrationFile);
      const sql = readFileSync(migrationPath, 'utf-8');
      
      await pool.query(sql);
      
      // Record successful migration
      if (!tableExists && version === 1) {
         await pool.query(`
           CREATE TABLE schema_migrations (
             version INTEGER PRIMARY KEY,
             applied_at TIMESTAMPTZ DEFAULT NOW()
           )
         `);
         await pool.query('INSERT INTO schema_migrations (version) VALUES (1)');
      } else {
         // Ensure table exists for subsequent migrations if it wasn't there initially
         await pool.query(`
           CREATE TABLE IF NOT EXISTS schema_migrations (
             version INTEGER PRIMARY KEY,
             applied_at TIMESTAMPTZ DEFAULT NOW()
           )
         `);
         await pool.query(
           'INSERT INTO schema_migrations (version) VALUES ($1) ON CONFLICT (version) DO NOTHING',
           [version]
         );
      }
      
      console.log(`✓ Migration ${version} (${migrationFile}) applied`);
    }
    
    console.log('✓ Database schema up to date');
    
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
