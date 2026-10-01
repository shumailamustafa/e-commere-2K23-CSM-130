import { requireAdmin, send, methodNotAllowed, normalizeError } from '../../../../lib/supabase.js';

export default async function handler(req, res) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return send(res, auth.status, { error: { code: auth.status === 401 ? 'UNAUTHENTICATED' : 'FORBIDDEN', message: auth.error } });
  const db = auth.client;

  if (req.method === 'GET') {
    const { data, error } = await db.from('products').select(`id, category_id, name, slug, description, status, created_at, updated_at, variants(id, option_values, skus(id, sku_code, price, stock_quantity, is_active))`).order('created_at', { ascending: false });
    if (error) { const e = normalizeError(error); return send(res, e.status, { error: { code: e.code, message: e.message } }); }
    return send(res, 200, { data });
  }

  if (req.method === 'POST') {
    const { name, slug, description = null, category_id } = req.body || {};
    if (!name || !slug || !category_id) return send(res, 400, { error: { code: 'VALIDATION_ERROR', message: 'name, slug, and category_id are required' } });
    const { data, error } = await db.from('products').insert({ name, slug, description, category_id, status: 'draft' }).select().single();
    if (error) { const e = normalizeError(error); return send(res, e.status, { error: { code: e.code, message: e.message } }); }
    return send(res, 201, { data });
  }
  return methodNotAllowed(res, ['GET', 'POST']);
}
