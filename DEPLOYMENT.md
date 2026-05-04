# Deployment Checklist

## 1. Environment

Set these variables in the deployment platform:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SITE_URL`

`NEXT_PUBLIC_SITE_URL` must match the real public domain, for example:

```env
NEXT_PUBLIC_SITE_URL=https://stores-checking-system.zeabur.app
```

## 2. Supabase

Apply SQL files in this order:

1. `supabase/migrations/20260408_000001_mvp_schema.sql`
2. `supabase/migrations/20260408_000002_inspections.sql`
3. `supabase/migrations/20260408_000003_inspection_photos.sql`
4. `supabase/migrations/20260408_000004_audit_logs.sql`
5. `supabase/migrations/20260410_000005_localize_seed_content.sql`
6. `supabase/migrations/20260410_000006_fix_store_names.sql`
7. `supabase/migrations/20260411_000007_expand_focus_items_to_tags.sql`
8. `supabase/migrations/20260411_000008_workstations_and_shift_assignment.sql`
9. `supabase/migrations/20260412_000009_menu_item_photos.sql`
10. `supabase/migrations/20260423_000010_add_menu_observation_note.sql`
11. `supabase/seed.sql`

Before production:

- confirm `chahababa@gmail.com` is the correct owner account for production
- confirm Google OAuth is enabled
- add production callback URL: `<SITE_URL>/api/auth/callback`
- verify `inspection-photos` bucket exists
- if email notifications should be enabled, finish `TODO_RESEND_SETUP.md` and set `RESEND_API_KEY` / `RESEND_FROM_EMAIL` in Zeabur

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
10. If Resend env vars are configured, a completed inspection sends email to the store leader, managers, and owners.

## 5. Recommended First Production Pass

- confirm owner account `chahababa@gmail.com`
- create at least one manager account
- confirm all stores and focus items are seeded
- create one test inspection
- export one monthly report CSV
- export one single-inspection CSV
