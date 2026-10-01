import { requireAdmin, send, methodNotAllowed, normalizeError } from '../../../../lib/supabase.js';

export default async function handler(req, res) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return send(res, auth.status, { error: { code: auth.status === 401 ? 'UNAUTHENTICATED' : 'FORBIDDEN', message: auth.error } });
  const db = auth.client;

  if (req.method === 'GET') {
    const { data, error } = await db.from('categories').select('id, parent_id, name, slug, is_active, created_at, updated_at').order('name');
    if (error) { const e = normalizeError(error); return send(res, e.status, { error: { code: e.code, message: e.message } }); }
    return send(res, 200, { data });
  }

  if (req.method === 'POST') {
    const { name, slug, parent_id = null } = req.body || {};
    if (!name || !slug) return send(res, 400, { error: { code: 'VALIDATION_ERROR', message: 'name and slug are required' } });
    const { data, error } = await db.from('categories').insert({ name, slug, parent_id, is_active: true }).select().single();
    if (error) { const e = normalizeError(error); return send(res, e.status, { error: { code: e.code, message: e.message } }); }
    return send(res, 201, { data });
  }
  return methodNotAllowed(res, ['GET', 'POST']);
}
