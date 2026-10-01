import { requireAdmin, send, methodNotAllowed, normalizeError } from '../../../../../lib/supabase.js';
import { isValidMoney, isValidStock } from '../../../../../lib/validation.js';

export default async function handler(req, res) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return send(res, auth.status, { error: { code: auth.status === 401 ? 'UNAUTHENTICATED' : 'FORBIDDEN', message: auth.error } });
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);

  const productId = req.query.id;
  const { variant_id, sku_code, price, stock_quantity, is_active = true } = req.body || {};
  if (!variant_id || !sku_code || price === undefined || stock_quantity === undefined) return send(res, 400, { error: { code: 'VALIDATION_ERROR', message: 'variant_id, sku_code, price, and stock_quantity are required' } });
  if (!isValidMoney(price) || !isValidStock(stock_quantity)) return send(res, 400, { error: { code: 'VALIDATION_ERROR', message: 'price must be a non-negative number and stock_quantity must be a non-negative integer' } });

  const { data: variant, error: variantError } = await auth.client.from('variants').select('id, product_id').eq('id', variant_id).single();
  if (variantError || !variant || String(variant.product_id) !== String(productId)) return send(res, 400, { error: { code: 'INVALID_VARIANT', message: 'variant_id does not belong to this product' } });

  const { data, error } = await auth.client.from('skus').insert({ product_id: productId, variant_id, sku_code, price, stock_quantity, is_active }).select().single();
  if (error) { const e = normalizeError(error); return send(res, e.status, { error: { code: e.code, message: e.message } }); }
  return send(res, 201, { data });
}
