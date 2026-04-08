# Project Status

## Current Stage

`Stores Checking System` is currently at an internal beta stage.

The repo already includes:

- Next.js App Router + TypeScript + Tailwind foundation
- Supabase SSR auth with Google OAuth callback flow
- Role-based access for `owner`, `manager`, `leader`
- Settings modules for users, staff, items, and focus items
- Inspection create, edit, detail, history, lock, and delete flows
- Photo compression, upload, standard-photo toggle, and delete
- Improvement tracking workflow
- Monthly report page and CSV exports
- Audit log page and audit CSV export
- Deployment and handoff documentation
- Initial automated tests

## Latest Verified Checks

- `npm run test`
- `npm run lint`
- `npm run typecheck`
- `npm run build`

All checks passed at the latest local verification point.

## Data / Seed Status

- `supabase/seed.sql` has been cleaned and rewritten into a stable, readable seed file
- Seeded owner account is `chahababa@gmail.com`
- Seed data currently uses ASCII-safe store, category, and item names to avoid encoding issues

## Known External Blockers

- GitHub CLI authentication is currently invalid on this machine, so direct push is blocked until `gh auth login` is refreshed
- Production deployment still requires real `.env.local` / hosting values
- Supabase production project still needs migration and seed execution in the real environment

## Recommended Next Phase

1. Restore GitHub CLI authentication
2. Push this repo to a dedicated GitHub repository
3. Apply Supabase migrations and seed in the target project
4. Complete smoke testing against the real environment
5. Execute the go-live checklist
