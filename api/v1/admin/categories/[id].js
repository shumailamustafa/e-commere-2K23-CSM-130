import { requireAdmin, send, methodNotAllowed, normalizeError } from '../../../../lib/supabase.js';

export default async function handler(req, res) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return send(res, auth.status, { error: { code: auth.status === 401 ? 'UNAUTHENTICATED' : 'FORBIDDEN', message: auth.error } });
  const db = auth.client;
  const { id } = req.query;

  if (req.method === 'GET') {
    const { data, error } = await db.from('categories').select('id, parent_id, name, slug, is_active, created_at, updated_at').eq('id', id).maybeSingle();
    if (error) { const e = normalizeError(error); return send(res, e.status, { error: { code: e.code, message: e.message } }); }
    if (!data) return send(res, 404, { error: { code: 'NOT_FOUND', message: 'Category not found' } });
    return send(res, 200, { data });
  }

  if (req.method === 'PATCH') {
    const payload = Object.fromEntries(Object.entries(req.body || {}).filter(([k]) => ['name', 'slug', 'parent_id', 'is_active'].includes(k)));
    if (Object.keys(payload).length === 0) return send(res, 400, { error: { code: 'VALIDATION_ERROR', message: 'At least one editable field is required' } });
    const { data, error } = await db.from('categories').update(payload).eq('id', id).select().maybeSingle();
    if (error) { const e = normalizeError(error); return send(res, e.status, { error: { code: e.code, message: e.message } }); }
    if (!data) return send(res, 404, { error: { code: 'NOT_FOUND', message: 'Category not found' } });
    return send(res, 200, { data });
  }

  if (req.method === 'DELETE') {
    const { data, error } = await db.from('categories').delete().eq('id', id).select('id').maybeSingle();
    if (error) { const e = normalizeError(error); return send(res, e.status === 400 ? 409 : e.status, { error: { code: e.status === 400 ? 'IN_USE' : e.code, message: e.status === 400 ? 'Category cannot be deleted because it is referenced by other records' : e.message } }); }
    if (!data) return send(res, 404, { error: { code: 'NOT_FOUND', message: 'Category not found' } });
    return send(res, 200, { data: { id: data.id, deleted: true } });
  }

  return methodNotAllowed(res, ['GET', 'PATCH', 'DELETE']);
}
