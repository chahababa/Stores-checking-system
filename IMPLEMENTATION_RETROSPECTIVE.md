# Implementation Retrospective

## Purpose

This document records the major blockers, root causes, fixes, and prevention rules discovered while building and deploying `Stores Checking System`.

Use it when:

- writing the next spec
- handing the project to another AI or engineer
- reviewing why a previous deployment or feature rollout failed

## Major Incidents

### 1. GitHub Push Was Blocked By Expired `gh` Auth

- Symptom:
  - local push flow could not proceed even after the repo was prepared
- Root cause:
  - `gh auth status` showed an invalid token in keyring
- Fix:
  - rerun `gh auth login -h github.com`
  - verify with `gh auth status`
- Prevention:
  - before starting any publish or deploy flow, always verify:
    - `gh auth status`
    - repo exists
    - remote is configured
- Spec reminder:
  - add a preflight step: "Confirm GitHub CLI authentication before asking the agent to publish or deploy."

### 2. Zeabur Node Buildpack Was Unreliable

- Symptom:
  - Zeabur build failed with a broken generated step like `RUN npm update -g npm`
- Root cause:
  - platform buildpack path was not deterministic for this app
- Fix:
  - switched to a repo-owned `Dockerfile`
  - configured Next.js `output: "standalone"`
  - added `.dockerignore`
- Prevention:
  - for production deployment on Zeabur, prefer explicit Docker builds over opaque buildpack generation
- Spec reminder:
  - specify deployment strategy explicitly:
    - "Deploy with repo Dockerfile, not platform-generated Node buildpack."

### 3. Dockerfile And Platform Override Drift

- Symptom:
  - deployment only worked after Zeabur-side Docker override changes
- Root cause:
  - repo Dockerfile and platform override were not fully aligned
  - `public/` folder was missing in repo
  - `npm ci` behavior diverged from the actual lockfile state seen by the platform
- Fix:
  - added `public/.gitkeep`
  - kept Docker deployment path explicit
  - later synced lockfile and deployment behavior
- Prevention:
  - avoid long-term drift between:
    - repo Dockerfile
    - platform override
    - actual package-lock state
- Spec reminder:
  - require "repo is the source of truth for deployment config"
  - if platform override exists, track it in docs

### 4. `NEXT_PUBLIC_*` Env Access Broke Client Bundle

- Symptom:
  - login failed with:
    - `Missing required environment variable: NEXT_PUBLIC_SUPABASE_URL`
- Root cause:
  - `process.env[name]` dynamic access was used in client-reachable env helpers
  - Next.js only inlines public env vars when accessed statically, e.g. `process.env.NEXT_PUBLIC_SUPABASE_URL`
- Fix:
  - changed `src/lib/supabase/env.ts`
  - all `NEXT_PUBLIC_*` getters now use static property access
- Prevention:
  - never use dynamic env-key lookup for client-consumed `NEXT_PUBLIC_*` variables in Next.js
- Spec reminder:
  - include this rule explicitly:
    - "All `NEXT_PUBLIC_*` variables must be accessed with static `process.env.NEXT_PUBLIC_...` syntax."

### 5. OAuth Callback Redirect Used Internal Container Origin

- Symptom:
  - after Google OAuth success, callback redirected to `https://0.0.0.0:8080/`
- Root cause:
  - callback route used `new URL(request.url).origin`
  - under reverse proxy / standalone deployment, request origin reflected internal container address, not the public domain
- Fix:
  - changed callback route to use `getSiteUrl()`
  - redirects now use `NEXT_PUBLIC_SITE_URL`
- Prevention:
  - do not trust request-derived origin for final external redirects in proxied production deployments
- Spec reminder:
  - state this rule:
    - "All OAuth callback final redirects must use configured site URL, not request origin."

### 6. Login Button Failed Silently

- Symptom:
  - button stayed in loading state and did not visibly redirect or surface the true error
- Root cause:
  - login flow had no robust `try/catch`
  - browser redirect behavior was not explicitly controlled
- Fix:
  - added explicit error handling
  - changed OAuth initiation to use returned `data.url` and `window.location.assign(...)`
  - surfaced user-facing error message instead of silent loading
- Prevention:
  - all auth entry points should:
    - catch runtime exceptions
    - expose actionable error text
    - avoid silent loading dead ends
- Spec reminder:
  - require "no silent auth failure states"

### 7. English UI Was Not Just A UI Problem

- Symptom:
  - app shell and pages could be translated, but inspection categories and items still appeared in English
- Root cause:
  - some visible text lived in code
  - some visible text lived in database seed content
- Fix:
  - translated UI strings in app/components
  - updated `supabase/seed.sql`
  - added migration `20260410_000005_localize_seed_content.sql` to localize existing data rows
- Prevention:
  - separate localization into:
    - code-level UI strings
    - data-level content
- Spec reminder:
  - if language matters, specify both:
    - interface language
    - seeded / persisted business content language

### 8. Encoding Problems Created Risk In Seed Content

- Symptom:
  - earlier seed content showed mojibake / corrupted characters
- Root cause:
  - file encoding and console rendering ambiguity
- Fix:
  - rewrote seed deterministically
  - later localized again with explicit migration once deployment was stable
- Prevention:
  - avoid trusting console rendering alone for multilingual seed validation
  - validate content structurally and through actual app rendering
- Spec reminder:
  - require UTF-8 validation for multilingual seed files

## What Changed In Architecture / Process

- deployment moved from platform-generated behavior to repo-controlled Docker
- OAuth redirect logic moved from request-derived origin to configured site URL
- env helper design now distinguishes:
  - client-safe public env lookup
  - server-only secret lookup
- localization is now treated as both:
  - UI translation
  - persistent content translation

## Reusable Rules For Future Specs

When drafting future specs for this project or similar apps, include these explicit guardrails:

1. Environment variables:
   - `NEXT_PUBLIC_*` must use static `process.env.NEXT_PUBLIC_...` access.

2. OAuth:
   - callback final redirects must use configured site URL, not request-derived origin.

3. Deployment:
   - use explicit Docker deployment on Zeabur.
   - repo Dockerfile should be the source of truth.

4. Localization:
   - define both UI language and seed/data language.
   - if data is already in production, include a migration strategy.

5. Error handling:
   - login flows and save flows must not fail silently.

6. Release process:
   - repo deploy does not equal database migration.
   - treat code deploy and DB updates as separate checklist items.

## Recommended Post-Deployment Habit

After every significant fix, capture:

- symptom
- root cause
- exact file(s) changed
- whether DB data changed
- whether deployment config changed
- one prevention rule for future work

If you keep doing that, your specs will get noticeably better over time.
