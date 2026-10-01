# Blushique — Sprint 2 Catalog Data Foundation

Sprint 2 extends the Sprint 1 Blushique architecture into an implementation-ready PostgreSQL/Supabase catalog foundation.

## Stack

- React remains the Sprint 1 frontend choice.
- Supabase/PostgreSQL provides database and authentication.
- Vercel serverless functions expose the required `/api/v1/admin/...` administration routes.

## Local setup

1. Install Node.js 20 LTS.
2. Copy `.env.example` to `.env.local` and fill in Supabase values. Never commit `.env.local`.
3. Create the Supabase project and an Auth user `admin@blushique.test` (or change the seed email).
4. Run `supabase/migrations/001_catalog_foundation.sql` in the Supabase SQL Editor.
5. Run `supabase/seed.sql`.
6. Install dependencies with `npm install`.
7. Start the local API in **Terminal 1** with `npm start` (runs `vercel dev`) and wait for `Ready! Available at http://localhost:3000`. Keep it open.
8. In **Terminal 2** run the automated tests with `npm test` (the integration tests call the running API).
9. Optional: `npm run evidence` signs in as the admin, calls the API and writes redacted request/response evidence to `docs/EVIDENCE_OUTPUT.md`.

Send a Supabase access token as `Authorization: Bearer <token>` when calling the API manually.

### Troubleshooting

- `vercel dev must not recursively invoke itself`: the server script is named `start`, not `dev`, to avoid this. Use `npm start`.
- `Test timed out in 5000ms`: `vitest.config.mjs` raises the timeout to 60 s because each call to Supabase takes a few seconds. Make sure that file is present.
- `ECONNREFUSED`: the API is not running. Start it with `npm start` first.
- `SUPABASE_URL` must be the bare project URL (`https://<ref>.supabase.co`), with no trailing `/` or `/rest/v1`.

## Environment variables

- `SUPABASE_URL` — Supabase project URL.
- `SUPABASE_ANON_KEY` — public anon key used to validate JWTs.
- `SUPABASE_SERVICE_ROLE_KEY` — server-only key used after the API verifies the caller is an admin. Never expose it in frontend code.
- `TEST_ADMIN_EMAIL`, `TEST_ADMIN_PASSWORD`, `TEST_BASE_URL` — optional integration-test settings.

## API examples

Create a category:

```bash
curl -X POST "$TEST_BASE_URL/api/v1/admin/categories" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Lip Makeup","slug":"lip-makeup"}'
```

Create a draft product:

```bash
curl -X POST "$TEST_BASE_URL/api/v1/admin/products" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Velvet Matte Lipstick","slug":"velvet-matte-lipstick","category_id":1,"description":"Budget-friendly matte lipstick."}'
```

## Sprint 2 files

- `supabase/migrations/001_catalog_foundation.sql` — schema, constraints, triggers and RLS.
- `supabase/seed.sql` — reproducible catalog demonstration data.
- `api/v1/admin/` — authenticated administration endpoints.
- `vitest.config.mjs` — test timeout settings.
- `scripts/evidence.mjs` — generates redacted API evidence.
- `tests/` — automated business-rule and API-contract tests.
- `docs/SPRINT_2.md` — required sprint design and evidence document.
