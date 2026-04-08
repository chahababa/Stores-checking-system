# Release Notes

## Version

`v0.1.0-beta`

## Summary

This release delivers the first internal beta of the Stores Checking System. It covers authentication, authorization, settings management, inspection creation and editing, photo upload, improvement tracking, reporting, CSV export, audit logs, and initial automated tests.

## Included

- Google OAuth login with Supabase SSR auth
- Authorized-user gate through `public.users`
- Role support for `owner`, `manager`, `leader`
- Settings pages:
  - user access
  - staff
  - items
  - focus items
- Inspection workflow:
  - create inspection
  - edit inspection
  - lock / unlock inspection
  - owner-only delete
- Photo workflow:
  - compression before upload
  - standard photo toggle
  - delete photo
- Improvement workflow:
  - pending / resolved / verified / superseded
  - automatic status sync after inspection edits
- Reporting:
  - monthly report page
  - monthly CSV export
  - single inspection CSV export
  - audit CSV export
- Audit log page
- Initial Vitest coverage for reporting, audit helper, and env helper

## Operational Notes

- Audit logs require migration `20260408_000004_audit_logs.sql`
- Current seeded owner account is `chahababa@gmail.com`
- Production requires correct `NEXT_PUBLIC_SITE_URL`
- Google OAuth callback must match the deployed domain

## Validation

- `npm run test`
- `npm run lint`
- `npm run typecheck`
- `npm run build`

All checks passed at the latest handoff point.
