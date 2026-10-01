import 'dotenv/config';
import { describe, expect, it, beforeAll } from 'vitest';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const BASE = process.env.TEST_BASE_URL || 'http://localhost:3000';
const configured = !!(
  process.env.SUPABASE_URL &&
  process.env.SUPABASE_ANON_KEY &&
  process.env.TEST_NON_ADMIN_EMAIL &&
  process.env.TEST_NON_ADMIN_PASSWORD
);
const run = configured ? describe : describe.skip;

async function login(email, password) {
  const r = await fetch(`${process.env.SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: process.env.SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  return (await r.json()).access_token;
}

async function api(path, token) {
  const r = await fetch(`${BASE}/api/v1/admin${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });
  return r;
}

run('Sprint 2 authorization', () => {
  let token;

  beforeAll(async () => {
    token = await login(process.env.TEST_NON_ADMIN_EMAIL, process.env.TEST_NON_ADMIN_PASSWORD);
    expect(token).toBeTruthy();
  });

  it('rejects a valid non-admin user with 403', async () => {
    const response = await api('/products', token);
    expect(response.status).toBe(403);
  });
});
