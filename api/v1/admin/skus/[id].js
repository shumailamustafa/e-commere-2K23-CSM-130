import { requireAdmin, send, methodNotAllowed, normalizeError } from '../../../../lib/supabase.js';
import { isValidMoney, isValidStock } from '../../../../lib/validation.js';

export default async function handler(req, res) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return send(res, auth.status, { error: { code: auth.status === 401 ? 'UNAUTHENTICATED' : 'FORBIDDEN', message: auth.error } });
  const db = auth.client;
  const { id } = req.query;

  if (req.method === 'GET') {
    const { data, error } = await db.from('skus').select('id, product_id, variant_id, sku_code, price, stock_quantity, is_active, created_at, updated_at').eq('id', id).maybeSingle();
    if (error) { const e = normalizeError(error); return send(res, e.status, { error: { code: e.code, message: e.message } }); }
    if (!data) return send(res, 404, { error: { code: 'NOT_FOUND', message: 'SKU not found' } });
    return send(res, 200, { data });
  }

  if (req.method === 'PATCH') {
    const allowed = ['price', 'stock_quantity', 'is_active'];
    const payload = Object.fromEntries(Object.entries(req.body || {}).filter(([k]) => allowed.includes(k)));
    if (payload.price !== undefined && !isValidMoney(payload.price)) return send(res, 400, { error: { code: 'VALIDATION_ERROR', message: 'price must be a non-negative number' } });
    if (payload.stock_quantity !== undefined && !isValidStock(payload.stock_quantity)) return send(res, 400, { error: { code: 'VALIDATION_ERROR', message: 'stock_quantity must be a non-negative integer' } });
    if (Object.keys(payload).length === 0) return send(res, 400, { error: { code: 'VALIDATION_ERROR', message: 'price, stock_quantity, or is_active is required' } });

    const { data, error } = await db.from('skus').update(payload).eq('id', id).select().maybeSingle();
    if (error) { const e = normalizeError(error); return send(res, e.status, { error: { code: e.code, message: e.message } }); }
    if (!data) return send(res, 404, { error: { code: 'NOT_FOUND', message: 'SKU not found' } });
    return send(res, 200, { data });
  }

  if (req.method === 'DELETE') {
    const { data, error } = await db.from('skus').delete().eq('id', id).select('id').maybeSingle();
    if (error) {
      const e = normalizeError(error);
      if (e.code === 'FOREIGN_KEY') return send(res, 409, { error: { code: 'IN_USE', message: 'SKU cannot be deleted because it is referenced by a cart or order' } });
      return send(res, e.status, { error: { code: e.code, message: e.message } });
    }
    if (!data) return send(res, 404, { error: { code: 'NOT_FOUND', message: 'SKU not found' } });
    return send(res, 200, { data: { id: data.id, deleted: true } });
  }

  return methodNotAllowed(res, ['GET', 'PATCH', 'DELETE']);
}
