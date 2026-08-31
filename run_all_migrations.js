import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import pkg from 'pg';
const { Client } = pkg;

const connectionString = process.env.DATABASE_URL;
if (!connectionString || connectionString.includes('[YOUR-PASSWORD]')) {
  console.error('Error: Please configure DATABASE_URL in your .env file with your actual database password.');
  process.exit(1);
}

const migrationsDir = path.join(process.cwd(), 'supabase', 'migrations');

async function runAllMigrations() {
  const client = new Client({ connectionString });
  
  try {
    // 1. Read and sort SQL migration files
    if (!fs.existsSync(migrationsDir)) {
      console.error(`Migrations directory not found at: ${migrationsDir}`);
      process.exit(1);
    }
    
    const files = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort(); // Sorts chronologically/alphabetically
      
    if (files.length === 0) {
      console.log('No migration SQL files found.');
      return;
    }

    console.log(`Found ${files.length} migration files. Connecting to database...`);
    await client.connect();
    console.log('Connected to PostgreSQL successfully.');

    // 2. Run each migration file in order
    for (const file of files) {
      const filePath = path.join(migrationsDir, file);
      console.log(`Running migration: ${file}...`);
      const sql = fs.readFileSync(filePath, 'utf8');
      
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('COMMIT');
        console.log(`✅ Success: ${file}`);
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`❌ Error in migration ${file}:`, err.message);
        console.error('Migration execution stopped due to error.');
        process.exit(1);
      }
    }

    console.log('\n🎉 All migrations completed successfully!');
  } catch (err) {
    console.error('Connection or unexpected error:', err);
  } finally {
    await client.end();
  }
}

runAllMigrations();
