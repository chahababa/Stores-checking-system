# Open Items

## Production / Operations

- Finish Resend setup for inspection-completion email notifications:
  - verify `hoochuu.com.tw` in Resend
  - add DNS records
  - set `RESEND_API_KEY` and `RESEND_FROM_EMAIL` in Zeabur
  - send one test inspection and confirm email delivery / audit logs
- Confirm the production Supabase project has all current migrations applied:
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
- Execute the full production smoke test in `GO_LIVE_CHECKLIST.md`.
- Create or confirm real manager and leader accounts for day-to-day use.
- Confirm backup / recovery expectations for Supabase database and storage.

## Strongly Recommended

- Add route and server-action integration tests for the most critical flows.
- Add a second round of inspection workflow tests around edit, lock, and delete.
- Review seed content with the business owner and replace any remaining placeholder operational wording.
- Update `PRODUCTION_HANDOFF_TEMPLATE.md` after the next production verification pass.

## Nice to Have

- Dashboard-style home page.
- More visual charts in reports.
- PDF export or print-friendly report format.
- LINE integration, if still needed after email notifications are enabled.
- Photo library / standard-photo browsing experience.

## Resolved / Historical

- GitHub repo creation and initial push are complete. The active repo is `chahababa/Stores-checking-system`.
- The old GitHub CLI token blocker is no longer a production blocker. This machine currently has no `gh` command installed, so use git plus GitHub MCP/API for repo operations unless `gh` is installed later.
- Production hosting is already on Zeabur at `https://stores-checking-system.zeabur.app`.
