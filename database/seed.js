// Applies every .sql file in ./seeds, in filename order, every run.
// Seed files must be idempotent (ON CONFLICT DO NOTHING) — this is not tracked
// like migrations because seed data may legitimately be re-applied after resets.
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import pg from 'pg';
import 'dotenv/config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const seedsDir = path.join(__dirname, 'seeds');

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : undefined,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
});

async function run() {
  await client.connect();
  const files = readdirSync(seedsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const sql = readFileSync(path.join(seedsDir, file), 'utf8');
    console.log(`seed  ${file}`);
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      console.error(`FAILED ${file}:`, err.message);
      await client.end();
      process.exit(1);
    }
  }

  console.log('All seeds applied.');
  await client.end();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
