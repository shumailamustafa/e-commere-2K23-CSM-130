import { createClient } from '@supabase/supabase-js';

export function createPublicClient() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}

export function createAdminClient() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}

export async function requireAdmin(req) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return { ok: false, status: 401, error: 'Authentication required' };

  const authClient = createPublicClient();
  const { data: { user }, error: authError } = await authClient.auth.getUser(token);
  if (authError || !user) return { ok: false, status: 401, error: 'Invalid or expired token' };

  const adminClient = createAdminClient();
  const { data: profile, error: profileError } = await adminClient
    .from('profiles')
    .select('id, role')
    .eq('id', user.id)
    .single();

  if (profileError || profile?.role !== 'admin') {
    return { ok: false, status: 403, error: 'Administrator role required' };
  }
  return { ok: true, user, client: adminClient };
}

export function send(res, status, body) {
  return res.status(status).json(body);
}

export function methodNotAllowed(res, methods) {
  res.setHeader('Allow', methods.join(', '));
  return send(res, 405, { error: { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' } });
}

export function normalizeError(error) {
  if (error?.code === '23505') return { status: 409, code: 'DUPLICATE', message: 'A record with the same unique value already exists' };
  if (error?.code === '23503') return { status: 400, code: 'FOREIGN_KEY', message: 'Referenced record does not exist' };
  if (error?.code === '23514') return { status: 400, code: 'CONSTRAINT', message: error.message || 'Database constraint rejected the request' };
  return { status: 400, code: 'VALIDATION_ERROR', message: error?.message || 'Request could not be completed' };
}
