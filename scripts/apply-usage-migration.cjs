// Default is read-only inspection. --apply creates only the new usage table/indexes.
require('dotenv').config({ path: '.env.local', quiet: true });
const { Pool } = require('pg');
const { readFileSync } = require('node:fs');
const { createHash } = require('node:crypto');
const path = require('node:path');
const sql = readFileSync(path.join(__dirname, '../drizzle/0001_ai_usage.sql'), 'utf8');
const marker = 'hamrobot-ai-usage-v1:' + createHash('sha256').update(sql).digest('hex');
if (process.argv.slice(2).some(arg => arg !== '--apply')) throw Error('Only --apply is supported');
const apply = process.argv.includes('--apply');
const url = new URL(process.env.DATABASE_URL);
const pool = new Pool({ host: url.hostname, port: Number(url.port), user: decodeURIComponent(url.username), password: decodeURIComponent(url.password), database: url.pathname.slice(1), ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 10000, query_timeout: 20000 });
(async () => {
  const client = await pool.connect();
  try {
    await client.query(apply ? 'BEGIN' : 'BEGIN READ ONLY');
    await client.query("SET LOCAL lock_timeout = '5s'");
    if (apply) await client.query("SELECT pg_advisory_xact_lock(hashtext('hamrobot-ai-usage-v1'))");
    const result = await client.query("SELECT to_regclass('public.ai_usage') IS NOT NULL AS exists");
    if (result.rows[0].exists) {
      const existing = await client.query("SELECT obj_description('public.ai_usage'::regclass, 'pg_class') AS marker");
      if (existing.rows[0].marker !== marker) throw Error('An unrecognized ai_usage table exists; reconcile its schema before applying');
      console.log('Usage migration already applied; no changes.');
    } else if (apply) {
      await client.query(sql);
      // marker contains only a fixed prefix and a hex digest, never user input.
      await client.query("COMMENT ON TABLE public.ai_usage IS '" + marker + "'");
      console.log('Usage table, indexes and row-level security created.');
    } else {
      console.log('Pending: create ai_usage and two indexes, enable RLS. Existing tables/data remain unchanged.');
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); await pool.end(); }
})().catch(async error => { console.error('Usage migration failed:', error.code || error.message); await pool.end(); process.exitCode = 1; });
