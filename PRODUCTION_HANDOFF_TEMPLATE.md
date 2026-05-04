# Production Handoff Template

Fill this before final production rollout.

## Identity

- Production site URL:
  - `____________________________`
- Owner email:
  - `chahababa@gmail.com`
- Manager emails:
  - `____________________________`
- Leader emails and store mapping:
  - `____________________________`

## Environment Variables

- `NEXT_PUBLIC_SUPABASE_URL`
  - `____________________________`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `____________________________`
- `SUPABASE_SERVICE_ROLE_KEY`
  - `____________________________`
- `NEXT_PUBLIC_SITE_URL`
  - `____________________________`
- `RESEND_API_KEY`
  - `Set / Not set / N/A`
- `RESEND_FROM_EMAIL`
  - `____________________________ / N/A`

## OAuth

- Google OAuth enabled:
  - `Yes / No`
- Production callback URL:
  - `____________________________`

## Supabase Rollout

- Migration applied:
  - `20260408_000001_mvp_schema.sql`
  - `20260408_000002_inspections.sql`
  - `20260408_000003_inspection_photos.sql`
  - `20260408_000004_audit_logs.sql`
  - `20260410_000005_localize_seed_content.sql`
  - `20260410_000006_fix_store_names.sql`
  - `20260411_000007_expand_focus_items_to_tags.sql`
  - `20260411_000008_workstations_and_shift_assignment.sql`
  - `20260412_000009_menu_item_photos.sql`
  - `20260423_000010_add_menu_observation_note.sql`
- Seed applied:
  - `Yes / No`
- Placeholder owner removed:
  - `Already set to chahababa@gmail.com / No`

## Smoke Test Results

- Owner login:
  - `Pass / Fail`
- Manager login:
  - `Pass / Fail`
- Leader login:
  - `Pass / Fail`
- Unauthorized block:
  - `Pass / Fail`
- Create inspection:
  - `Pass / Fail`
- Edit inspection:
  - `Pass / Fail`
- Lock inspection:
  - `Pass / Fail`
- Upload photo:
  - `Pass / Fail`
- Export monthly CSV:
  - `Pass / Fail`
- Export inspection CSV:
  - `Pass / Fail`
- Export audit CSV:
  - `Pass / Fail`
- Inspection completion email, if enabled:
  - `Pass / Fail / N/A`

## Final Notes

- Known limitations:
  - `____________________________`
- Follow-up work after beta:
  - `____________________________`
