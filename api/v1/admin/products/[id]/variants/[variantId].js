import { requireAdmin, send, methodNotAllowed, normalizeError } from '../../../../../lib/supabase.js';

export default async function handler(req, res) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return send(res, auth.status, { error: { code: auth.status === 401 ? 'UNAUTHENTICATED' : 'FORBIDDEN', message: auth.error } });
  const db = auth.client;
  const { id: productId, variantId } = req.query;

  if (req.method === 'GET') {
    const { data, error } = await db.from('variants').select('id, product_id, option_values, created_at, updated_at, skus(id, sku_code, price, stock_quantity, is_active)').eq('id', variantId).eq('product_id', productId).maybeSingle();
    if (error) { const e = normalizeError(error); return send(res, e.status, { error: { code: e.code, message: e.message } }); }
    if (!data) return send(res, 404, { error: { code: 'NOT_FOUND', message: 'Variant not found' } });
    return send(res, 200, { data });
  }

  if (req.method === 'PATCH') {
    const { option_values } = req.body || {};
    if (!option_values || typeof option_values !== 'object' || Array.isArray(option_values) || Object.keys(option_values).length === 0) {
      return send(res, 400, { error: { code: 'VALIDATION_ERROR', message: 'option_values must be a non-empty object' } });
    }
    const { data, error } = await db.from('variants').update({ option_values }).eq('id', variantId).eq('product_id', productId).select().maybeSingle();
    if (error) { const e = normalizeError(error); return send(res, e.status, { error: { code: e.code, message: e.message } }); }
    if (!data) return send(res, 404, { error: { code: 'NOT_FOUND', message: 'Variant not found' } });
    return send(res, 200, { data });
  }

  if (req.method === 'DELETE') {
    const { data, error } = await db.from('variants').delete().eq('id', variantId).eq('product_id', productId).select('id').maybeSingle();
    if (error) {
      const e = normalizeError(error);
      if (e.code === 'FOREIGN_KEY') return send(res, 409, { error: { code: 'IN_USE', message: 'Variant cannot be deleted because one of its SKUs is referenced by a cart or order' } });
      return send(res, e.status, { error: { code: e.code, message: e.message } });
    }
    if (!data) return send(res, 404, { error: { code: 'NOT_FOUND', message: 'Variant not found' } });
    return send(res, 200, { data: { id: data.id, deleted: true } });
  }

  return methodNotAllowed(res, ['GET', 'PATCH', 'DELETE']);
}
