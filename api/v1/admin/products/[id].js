import { requireAdmin, send, methodNotAllowed, normalizeError } from '../../../../lib/supabase.js';
import { canPublish } from '../../../../lib/validation.js';

export default async function handler(req, res) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return send(res, auth.status, { error: { code: auth.status === 401 ? 'UNAUTHENTICATED' : 'FORBIDDEN', message: auth.error } });
  const db = auth.client;
  const { id } = req.query;

  if (req.method === 'GET') {
    const { data, error } = await db.from('products')
      .select(`id, category_id, name, slug, description, status, specifications, created_at, updated_at, variants(id, option_values, skus(id, product_id, variant_id, sku_code, price, stock_quantity, is_active))`)
      .eq('id', id).maybeSingle();
    if (error) { const e = normalizeError(error); return send(res, e.status, { error: { code: e.code, message: e.message } }); }
    if (!data) return send(res, 404, { error: { code: 'NOT_FOUND', message: 'Product not found' } });
    return send(res, 200, { data });
  }

  if (req.method === 'PATCH') {
    const allowed = ['name', 'slug', 'description', 'category_id', 'status'];
    const payload = Object.fromEntries(Object.entries(req.body || {}).filter(([k]) => allowed.includes(k)));
    if (payload.status && !['draft', 'published'].includes(payload.status)) return send(res, 400, { error: { code: 'VALIDATION_ERROR', message: 'status must be draft or published' } });

    if (payload.status === 'published') {
      const { data: skus, error: skuError } = await db.from('skus').select('is_active, stock_quantity').eq('product_id', id);
      if (skuError) { const e = normalizeError(skuError); return send(res, e.status, { error: { code: e.code, message: e.message } }); }
      if (!canPublish(skus || [])) return send(res, 400, { error: { code: 'NO_SELLABLE_SKU', message: 'A published product must have at least one sellable SKU' } });
    }

    if (Object.keys(payload).length === 0) return send(res, 400, { error: { code: 'VALIDATION_ERROR', message: 'At least one editable field is required' } });
    const { data, error } = await db.from('products').update(payload).eq('id', id).select().maybeSingle();
    if (error) { const e = normalizeError(error); return send(res, e.status, { error: { code: e.code, message: e.message } }); }
    if (!data) return send(res, 404, { error: { code: 'NOT_FOUND', message: 'Product not found' } });
    return send(res, 200, { data });
  }

  if (req.method === 'DELETE') {
    const { data, error } = await db.from('products').delete().eq('id', id).select('id').maybeSingle();
    if (error) {
      const e = normalizeError(error);
      if (e.code === 'FOREIGN_KEY') return send(res, 409, { error: { code: 'IN_USE', message: 'Product cannot be deleted because one of its SKUs is referenced by a cart or order' } });
      return send(res, e.status, { error: { code: e.code, message: e.message } });
    }
    if (!data) return send(res, 404, { error: { code: 'NOT_FOUND', message: 'Product not found' } });
    return send(res, 200, { data: { id: data.id, deleted: true } });
  }

  return methodNotAllowed(res, ['GET', 'PATCH', 'DELETE']);
}
