const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env'), quiet: true });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 2 });
const directory = path.resolve(__dirname, '../migrations');

async function migrate(direction) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query("SELECT pg_advisory_xact_lock(hashtext('tetrascience-migrations'))");
    await client.query('CREATE TABLE IF NOT EXISTS tetrascience_migrations (name VARCHAR(255) PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW())');
    const applied = (await client.query('SELECT name FROM tetrascience_migrations ORDER BY name')).rows.map(row => row.name);
    const files = fs.readdirSync(directory).filter(file => file.endsWith('.up.sql')).sort();
    if (direction === 'up') {
      for (const file of files.filter(file => !applied.includes(file))) {
        await client.query(fs.readFileSync(path.join(directory, file), 'utf8'));
        await client.query('INSERT INTO tetrascience_migrations(name) VALUES ($1)', [file]);
        console.log(`Migrated ${file}`);
      }
    } else {
      const file = applied.at(-1);
      if (!file) console.log('No migration to undo');
      else {
        const down = file.replace(/\.up\.sql$/, '.rollback.pgsql');
        if (!fs.existsSync(path.join(directory, down))) throw new Error(`Missing rollback ${down}`);
        await client.query(fs.readFileSync(path.join(directory, down), 'utf8'));
        await client.query('DELETE FROM tetrascience_migrations WHERE name=$1', [file]);
        console.log(`Reverted ${file}`);
      }
    }
    await client.query('COMMIT');
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}
const direction = process.argv[2] || 'up';
if (!['up', 'down'].includes(direction)) throw new Error('Usage: node scripts/migrate.js up|down');
migrate(direction).catch(error => { console.error(`Migration failed: ${error.message}`); process.exitCode = 1; }).finally(() => pool.end());
