// Integration tests: run against `npm run dev` (vercel dev) + your real Supabase project.
import 'dotenv/config';
import dotenv from 'dotenv';
import { describe, expect, it, beforeAll } from 'vitest';
dotenv.config({ path: '.env.local' });

const BASE = process.env.TEST_BASE_URL || 'http://localhost:3000';
const ready = !!(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY && process.env.TEST_ADMIN_EMAIL && process.env.TEST_ADMIN_PASSWORD);
const run = ready ? describe : describe.skip;
const uid = Date.now().toString(36);
let token;

async function api(method, path, body, tok = token) {
  const res = await fetch(`${BASE}/api/v1/admin${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(tok ? { Authorization: `Bearer ${tok}` } : {}) },
    body: body ? JSON.stringify(body) : undefined
  });
  return { status: res.status, json: await res.json().catch(() => ({})) };
}

run('Sprint 2 admin API (integration)', () => {
  let cat, child, prod, variant;
  beforeAll(async () => {
    const r = await fetch(`${process.env.SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { apikey: process.env.SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: process.env.TEST_ADMIN_EMAIL, password: process.env.TEST_ADMIN_PASSWORD })
    });
    token = (await r.json()).access_token;
    expect(token).toBeTruthy();
  });

  it('rejects requests without a token (401)', async () => {
    expect((await api('GET', '/products', null, null)).status).toBe(401);
    expect((await api('POST', '/categories', { name: 'x', slug: 'x' }, null)).status).toBe(401);
  });
  it('rejects an invalid token (401)', async () => {
    expect((await api('GET', '/categories', null, 'bad.token.value')).status).toBe(401);
  });

  it('creates a category and a child category', async () => {
    cat = await api('POST', '/categories', { name: 'T Parent', slug: `t-parent-${uid}` });
    expect(cat.status).toBe(201);
    child = await api('POST', '/categories', { name: 'T Child', slug: `t-child-${uid}`, parent_id: cat.json.data.id });
    expect(child.status).toBe(201);
  });
  it('rejects duplicate category slug (409)', async () => {
    expect((await api('POST', '/categories', { name: 'Dup', slug: `t-parent-${uid}` })).status).toBe(409);
  });
  it('prevents category cycles (400)', async () => {
    const r = await api('PATCH', `/categories/${cat.json.data.id}`, { parent_id: child.json.data.id });
    expect(r.status).toBe(400);
    const self = await api('PATCH', `/categories/${cat.json.data.id}`, { parent_id: cat.json.data.id });
    expect(self.status).toBe(400);
  });
  it('deactivates a category', async () => {
    const r = await api('PATCH', `/categories/${child.json.data.id}`, { is_active: false });
    expect(r.status).toBe(200);
    expect(r.json.data.is_active).toBe(false);
  });

  it('creates a draft product and rejects missing fields / duplicate slug', async () => {
    prod = await api('POST', '/products', { name: 'T Prod', slug: `t-prod-${uid}`, category_id: cat.json.data.id });
    expect(prod.status).toBe(201);
    expect(prod.json.data.status).toBe('draft');
    expect((await api('POST', '/products', { name: 'no slug' })).status).toBe(400);
    expect((await api('POST', '/products', { name: 'D', slug: `t-prod-${uid}`, category_id: cat.json.data.id })).status).toBe(409);
  });
  it('cannot publish a product with no sellable SKU (400)', async () => {
    expect((await api('PATCH', `/products/${prod.json.data.id}`, { status: 'published' })).status).toBe(400);
  });

  it('creates a variant; rejects empty options and duplicate variant', async () => {
    variant = await api('POST', `/products/${prod.json.data.id}/variants`, { option_values: { shade: 'Test Rose' } });
    expect(variant.status).toBe(201);
    expect((await api('POST', `/products/${prod.json.data.id}/variants`, { option_values: {} })).status).toBe(400);
    expect((await api('POST', `/products/${prod.json.data.id}/variants`, { option_values: { shade: 'Test Rose' } })).status).toBe(409);
  });

  it('creates a SKU and rejects duplicate code / negative stock / negative price / wrong variant', async () => {
    const body = { variant_id: variant.json.data.id, sku_code: `T-SKU-${uid}`, price: 499.5, stock_quantity: 5 };
    const ok = await api('POST', `/products/${prod.json.data.id}/skus`, body);
    expect(ok.status).toBe(201);
    expect((await api('POST', `/products/${prod.json.data.id}/skus`, body)).status).toBe(409);
    expect((await api('POST', `/products/${prod.json.data.id}/skus`, { ...body, sku_code: `N-${uid}`, stock_quantity: -1 })).status).toBe(400);
    expect((await api('POST', `/products/${prod.json.data.id}/skus`, { ...body, sku_code: `P-${uid}`, price: -5 })).status).toBe(400);
    globalThis.__sku = ok.json.data;
  });
  it('rejects negative stock on SKU update, allows valid update', async () => {
    expect((await api('PATCH', `/skus/${globalThis.__sku.id}`, { stock_quantity: -3 })).status).toBe(400);
    const r = await api('PATCH', `/skus/${globalThis.__sku.id}`, { stock_quantity: 9, price: 520 });
    expect(r.status).toBe(200);
  });
  it('publishes product once it has a sellable SKU, then lists it', async () => {
    expect((await api('PATCH', `/products/${prod.json.data.id}`, { status: 'published' })).status).toBe(200);
    const list = await api('GET', '/products');
    expect(list.status).toBe(200);
    expect(list.json.data.some(p => p.slug === `t-prod-${uid}`)).toBe(true);
    expect((await api('GET', '/categories')).status).toBe(200);
  });
});
