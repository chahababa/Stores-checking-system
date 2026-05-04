# Project Status

## Current Stage

`Stores Checking System` is currently at an internal beta stage and is deployed on Zeabur.

- GitHub repo: `chahababa/Stores-checking-system`
- Default branch: `main`
- Production URL: `https://stores-checking-system.zeabur.app`
- Current production behavior: unauthenticated `/` requests redirect to `/login`, and `/login` responds successfully.

The repo already includes:

- Next.js App Router + TypeScript + Tailwind foundation
- Supabase SSR auth with Google OAuth callback flow
- Role-based access for `owner`, `manager`, `leader`
- Settings modules for users, staff, items, focus items, stores, workstations, and QA cleanup
- Inspection create, edit, detail, history, lock, and delete flows
- Photo compression, upload, standard-photo toggle, and delete
- Improvement tracking workflow
- Monthly report page and CSV exports
- Audit log page and audit CSV export
- In-app notification center
- Optional Resend email notification code for completed inspections
- Deployment and handoff documentation
- Unit and Playwright test setup

## Latest Verified Checks

The documented quality gate remains:

- `npm run test`
- `npm run lint`
- `npm run typecheck`
- `npm run build`

Run the full gate before merging code changes or deploying manually.

## Data / Seed Status

- `supabase/seed.sql` is localized and currently seeds Chinese store, category, and item names.
- Seeded owner account is `chahababa@gmail.com`.
- Current migration set has 10 files, from `20260408_000001_mvp_schema.sql` through `20260423_000010_add_menu_observation_note.sql`.

## Current External / Operational Notes

- GitHub repo and `origin/main` are configured; the old “restore gh auth and push repo” blocker is resolved.
- The local machine does not currently have the `gh` CLI installed, so GitHub operations should use git plus GitHub MCP/API unless `gh` is installed later.
- The production Zeabur app is reachable at `https://stores-checking-system.zeabur.app`.
- Resend inspection-completion email is implemented in code but remains disabled until `RESEND_API_KEY` and `RESEND_FROM_EMAIL` are configured in Zeabur. See `TODO_RESEND_SETUP.md`.
- Local Supabase CLI is not linked in this working tree; use the known production project explicitly when checking remote migration state.

## Recommended Next Phase

1. Finish Resend domain/API-key setup if email notifications should go live.
2. Confirm production Supabase migration state against the current 10 migration files.
3. Run the full smoke test in `GO_LIVE_CHECKLIST.md` against production.
4. Add more route/server-action integration tests for critical flows.
5. Decide whether LINE integration is still desired after email notifications are enabled.
