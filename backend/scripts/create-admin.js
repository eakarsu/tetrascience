const { spawnSync } = require('node:child_process');
const path = require('node:path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env'), quiet: true });

function requireDisposableRuntime() {
  if (process.env.NODE_ENV !== 'test' || process.env.ALLOW_DISPOSABLE_SEED !== 'YES') {
    throw new Error('create-admin is restricted to an acknowledged disposable test runtime');
  }
  const database = new URL(process.env.DATABASE_URL || '');
  if (!['127.0.0.1', 'localhost', '::1'].includes(database.hostname)) throw new Error('create-admin requires a loopback database');
}

requireDisposableRuntime();
const email = String(process.env.PROVISION_ADMIN_EMAIL || process.env.ADMIN_EMAIL || '').trim().toLowerCase();
const password = String(process.env.PROVISION_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || '');
const name = String(process.env.PROVISION_ADMIN_NAME || 'Runtime Acceptance').trim();
if (!email || password.length < 12 || !name) throw new Error('Acceptance administrator credentials are incomplete');

const result = spawnSync(process.execPath, [
  require.resolve('./create-user'), 'runtime-tenant', 'Runtime Acceptance Tenant', email, 'TENANT_ADMIN', name,
], {
  env: { ...process.env, TETRASCIENCE_INITIAL_PASSWORD: password },
  stdio: 'inherit',
});
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status || 1);
