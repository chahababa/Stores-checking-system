# Go-Live Checklist

## Product

- Confirm all 4 stores are present in production seed data
- Confirm inspection categories and items are correct
- Confirm focus items are ready for the target month
- Confirm owner and manager accounts are created
- Confirm leader accounts are assigned to the correct store

## Environment

- Fill `NEXT_PUBLIC_SUPABASE_URL`
- Fill `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Fill `SUPABASE_SERVICE_ROLE_KEY`
- Fill `NEXT_PUBLIC_SITE_URL`
- Confirm production callback URL is `<SITE_URL>/api/auth/callback`

## Supabase

- Apply migrations in order
- Run `seed.sql`
- Confirm seeded owner email is `chahababa@gmail.com`
- Confirm `inspection-photos` bucket exists
- Confirm Google OAuth is enabled
- Confirm RLS policies are active

## Validation

- Run `npm run test`
- Run `npm run lint`
- Run `npm run typecheck`
- Run `npm run build`

## Smoke Test

- Login with owner account
- Login with manager account
- Login with leader account
- Confirm unauthorized account is blocked
- Create one inspection
- Edit the inspection
- Lock the inspection
- Export monthly report CSV
- Export single inspection CSV
- Export audit CSV
- Upload one photo and mark it as standard
- Verify audit entries appear

## Launch Decision

- Owner email verified
- Production domain finalized
- OAuth callback finalized
- Supabase environment verified
- Smoke test completed
- Internal handoff completed
