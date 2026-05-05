# Deployment Checklist

## 1. Environment

Set these variables in the deployment platform:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SITE_URL`
- `RELEASE_ANNOUNCEMENT_WEBHOOK_SECRET` — required only when GitHub Actions should automatically publish system update notifications after `main` changes.

`NEXT_PUBLIC_SITE_URL` must match the real public domain, for example:

```env
NEXT_PUBLIC_SITE_URL=https://stores-checking.example.com
```

## 2. Supabase

Apply SQL files in this order:

1. `supabase/migrations/20260408_000001_mvp_schema.sql`
2. `supabase/migrations/20260408_000002_inspections.sql`
3. `supabase/migrations/20260408_000003_inspection_photos.sql`
4. `supabase/migrations/20260408_000004_audit_logs.sql`
5. `supabase/migrations/20260410_000005_localize_seed_content.sql`
6. Later feature migrations in filename order, including:
   - `supabase/migrations/20260504_000012_release_announcements.sql`
   - `supabase/migrations/20260504_000013_release_announcement_sources.sql`
7. `supabase/seed.sql`

Before production:

- confirm `chahababa@gmail.com` is the correct owner account for production
- confirm Google OAuth is enabled
- add production callback URL: `<SITE_URL>/api/auth/callback`
- verify `inspection-photos` bucket exists

## 3. Pre-Deploy Checks

Run locally:

```bash
npm run test
npm run lint
npm run typecheck
npm run build
```

## 4. Post-Deploy Smoke Test

Verify:

1. Google login works.
2. Authorized user can access `/`.
3. Unauthorized user is redirected to `/forbidden`.
4. Owner can create / lock / delete inspections.
5. Manager can create / edit inspections and manage tasks.
6. Leader can view allowed pages only.
7. Photo upload works.
8. CSV exports work:
   - `/api/reports/inspection`
   - `/api/reports/inspection/[id]`
9. Audit log entries appear in `/audit`.

## 5. Recommended First Production Pass

- confirm owner account `chahababa@gmail.com`
- create at least one manager account
- confirm all stores and focus items are seeded
- create one test inspection
- export one monthly report CSV
- export one single-inspection CSV
