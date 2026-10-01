import { requireAdmin, send, methodNotAllowed, normalizeError } from '../../../../../lib/supabase.js';

export default async function handler(req, res) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return send(res, auth.status, { error: { code: auth.status === 401 ? 'UNAUTHENTICATED' : 'FORBIDDEN', message: auth.error } });
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);

  const { option_values } = req.body || {};
  if (!option_values || typeof option_values !== 'object' || Array.isArray(option_values) || Object.keys(option_values).length === 0) {
    return send(res, 400, { error: { code: 'VALIDATION_ERROR', message: 'option_values must be a non-empty object, e.g. {"shade":"Rose Nude"}' } });
  }
  const { data, error } = await auth.client.from('variants').insert({ product_id: req.query.id, option_values }).select().single();
  if (error) { const e = normalizeError(error); return send(res, e.status, { error: { code: e.code, message: e.message } }); }
  return send(res, 201, { data });
}
