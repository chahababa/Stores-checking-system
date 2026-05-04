# Stores Checking System

Internal store inspection system built with `Next.js + TypeScript + Tailwind + Supabase`.

## Current Scope

- Google OAuth login with Supabase SSR auth
- Authorized user gate via `public.users`
- Role-based access for `owner`, `manager`, `leader`
- Settings pages:
  - `/settings/users`
  - `/settings/staff`
  - `/settings/items`
  - `/settings/focus-items`
  - `/settings/stores`
  - `/settings/workstations`
  - `/settings/qa-cleanup`
- Inspection workflow:
  - `/inspection/new`
  - `/inspection/history`
  - `/inspection/history/[id]`
  - `/inspection/history/[id]/edit`
  - `/inspection/improvements`
  - `/inspection/reports`
- Photos:
  - client-side compression
  - Supabase Storage upload
  - standard photo toggle
  - delete photo from detail page
- Controls:
  - inspection lock / unlock
  - owner-only inspection delete
- Reporting:
  - monthly summary page
  - monthly CSV export
  - single-inspection CSV export
- Audit:
  - `/audit`
  - key write actions logged in `public.audit_logs`
- Notifications:
  - `/notifications` in-app notification center
  - optional inspection-completion email via Resend when `RESEND_API_KEY` and `RESEND_FROM_EMAIL` are configured

## Environment

Create `.env.local` from `.env.example` and fill:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SITE_URL`
- `RESEND_API_KEY` (optional; enables inspection-completion email notifications)
- `RESEND_FROM_EMAIL` (optional; required together with `RESEND_API_KEY`)

Recommended local value:

```env
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

## Supabase Setup

1. Create a Supabase project.
2. Enable Google OAuth in `Authentication > Providers`.
3. Add callback URL:
   - local: `http://localhost:3000/api/auth/callback`
   - production: `<YOUR_SITE_URL>/api/auth/callback`
4. Run migrations in order:
   - `supabase/migrations/20260408_000001_mvp_schema.sql`
   - `supabase/migrations/20260408_000002_inspections.sql`
   - `supabase/migrations/20260408_000003_inspection_photos.sql`
   - `supabase/migrations/20260408_000004_audit_logs.sql`
   - `supabase/migrations/20260410_000005_localize_seed_content.sql`
   - `supabase/migrations/20260410_000006_fix_store_names.sql`
   - `supabase/migrations/20260411_000007_expand_focus_items_to_tags.sql`
   - `supabase/migrations/20260411_000008_workstations_and_shift_assignment.sql`
   - `supabase/migrations/20260412_000009_menu_item_photos.sql`
   - `supabase/migrations/20260423_000010_add_menu_observation_note.sql`
5. Run `supabase/seed.sql`.
6. The seeded owner email is currently set to `chahababa@gmail.com`.

## Scripts

- `npm run dev`
- `npm run test`
- `npm run test:e2e`
- `npm run test:e2e:headed`
- `npm run test:e2e:auth:owner`
- `npm run test:e2e:auth:leader`
- `npm run lint`
- `npm run typecheck`
- `npm run build`

## Short Start Guide

1. Copy `.env.example` to `.env.local`
2. Fill the Supabase keys and `NEXT_PUBLIC_SITE_URL`
3. Apply all migrations in order
4. Run `supabase/seed.sql`
5. Start the app with `npm run dev`
6. Sign in with `chahababa@gmail.com`

## Quality Status

Current repo checks:

- `npm run test`
- `npm run lint`
- `npm run typecheck`
- `npm run build`

## UI / E2E Testing

Playwright is configured under [`playwright.config.ts`](playwright.config.ts).

- Public smoke tests live in [`e2e/public-smoke.spec.ts`](e2e/public-smoke.spec.ts)
- Optional authenticated dashboard checks live in [`e2e/authenticated-dashboards.spec.ts`](e2e/authenticated-dashboards.spec.ts)
- Setup notes are in [`e2e/README.md`](e2e/README.md)

## Notes

- The current seeded owner account is `chahababa@gmail.com`.
- Leader access is intentionally narrower than owner / manager access.
- Production is deployed on Zeabur at `https://stores-checking-system.zeabur.app` and redirects unauthenticated users to `/login`.
- Email notification code is present but remains disabled unless the Resend environment variables are configured. See `TODO_RESEND_SETUP.md`.
- LINE integration is still not included.
