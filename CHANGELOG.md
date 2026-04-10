# Changelog

All notable deployment and operational changes to the Stores Checking System.

## 2026-04-10

### Deployment Agent Session (Claude Opus via Browser)

#### Commits verified & deployed on Zeabur

| Commit | Message | Result |
|--------|---------|--------|
| `428bdac` | fix: stabilize inspection form focus item queries | Deployed — but /inspection/new still broken (Digest 556599903) |
| `c1af5d1` | feat: add store management and restore store names | Deployed — store management working, migration executed |
| `1d48493` | fix: move inspection mutations to server actions | Deployed — /inspection/new fully fixed |
| `ch67b6…` | fix: handle read-only cookie context in server supabase client | Committed — pending Zeabur auto-deploy |

#### Supabase migration executed

- `20260410_000006_fix_store_names.sql` — UPDATE on `stores` table: store_1→1店, store_2→2店, store_3→3店, store_4→4店. Data-only, no schema changes.

- #### Bug fixes applied

- 1. **Digest 556599903** (`/inspection/new` crash): `createInspection` in `src/lib/inspection.ts` used `import "server-only"` instead of `"use server"` directive, so it was not a Server Action but was passed as a prop to a Client Component. Fix: created `src/lib/inspection-actions.ts` with `"use server"` (commit `1d48493`).
 
  2. 2. **Digest 3211860576** (homepage crash after redeployment): Stale auth cookies cause `cookieStore.set()` to throw in read-only Server Component context. Fix: wrapped `setAll` in try-catch in `src/lib/supabase/server.ts` (commit `ch67b6…`).
    
     3. #### Google Cloud OAuth
    
     4. - Published OAuth consent screen from **Testing** to **Production** on Google Cloud project `daily-briefing-bot-492012`. All Google accounts can now log in (no longer limited to test users only).
       
        - #### Full site verification (all pages confirmed working)
       
        - - `/login` — OK
          - - `/inspection/history` — OK
            - - `/inspection/new` — OK (was the main blocker, now fixed)
              - - `/inspection/improvements` — OK
                - - `/inspection/reports` — OK
                  - - `/audit` — OK
                    - - `/settings/stores` — OK (new page, store names: 1店/2店/3店/4店)
                      - 
