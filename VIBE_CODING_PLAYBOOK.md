# Vibe Coding Playbook

## Goal

Use this playbook to reduce repeated mistakes when building with AI assistance.

This is not project-specific code documentation. It is a working method.

## Standard Workflow

### 1. Start With Preflight Checks

Before writing or deploying anything, confirm:

- git repo status is clean enough to understand
- GitHub auth works
- deployment target is known
- environment variables are known
- database migration status is known

Never assume those are already correct.

### 2. Split Work Into Four Layers

Whenever you write a spec or ask an AI to implement something, separate the work into:

1. UI layer
   - visible pages
   - labels
   - buttons
   - empty states

2. App logic layer
   - validation
   - auth flow
   - redirects
   - file upload logic

3. Deployment layer
   - Dockerfile
   - runtime env vars
   - hosting platform behavior

4. Data layer
   - schema changes
   - seed changes
   - migrations for already-existing production data

This separation prevents a lot of "we fixed the UI but forgot the database text" mistakes.

### 3. Treat "Fix" Types Differently

Every change should be tagged mentally as one of:

- code-only fix
- deployment-only fix
- data-only fix
- multi-layer fix

Examples:

- `NEXT_PUBLIC_*` env helper bug:
  - code-only
- Zeabur buildpack issue:
  - deployment-only
- translating inspection item names already stored in DB:
  - data-only
- OAuth callback redirect under reverse proxy:
  - code + deployment awareness

## Best Practices For Future AI Specs

### Be Explicit About Runtime Assumptions

If the app uses:

- reverse proxy
- standalone Next.js
- Docker
- OAuth
- Supabase

then the spec should say so up front.

A lot of bugs came from hidden runtime assumptions.

### Always Specify Source Of Truth

For every area, name the source of truth:

- deployment config: repo Dockerfile or platform UI override?
- env values: `.env.local`, Zeabur env, or Supabase dashboard?
- seeded content: `seed.sql` or admin UI?
- role definitions: DB enum or front-end label mapping?

If the source of truth is unclear, drift happens.

### Require Non-Silent Error Handling

Add this to future specs:

- auth actions must surface visible errors
- important writes must return actionable failure states
- loading states must not be infinite without feedback

### Require Verification Steps Per Layer

For each feature, define:

- implementation step
- verification step

Example:

- Fix callback redirect
  - verify returned URL uses public domain

- Fix env helper
  - verify client bundle no longer throws missing env

- Translate seed content
  - verify database rows, not just source file

## Lightweight Incident Log Template

Use this template every time something goes wrong:

### Incident

- What broke?

### Symptom

- What did the user or system actually do?

### Root Cause

- Why did it happen technically?

### Fix

- Which file / config / migration fixed it?

### Scope

- Code only
- Deployment only
- Data only
- Multi-layer

### Prevention Rule

- One sentence that should go into the next spec

## Suggested Files To Maintain Going Forward

- `RELEASE_NOTES.md`
  - user-facing release scope

- `IMPLEMENTATION_RETROSPECTIVE.md`
  - engineering lessons and postmortems

- `GO_LIVE_CHECKLIST.md`
  - operational launch checklist

- `OPEN_ITEMS.md`
  - unfinished work

This combination is enough for most small AI-assisted projects.

## Simple Team Rule

After every successful fix, ask:

1. Was this a code problem, a deployment problem, or a data problem?
2. What assumption was wrong?
3. What single sentence should be added to the next spec to prevent it?

That habit is usually enough to make each next round of Vibe coding much better than the last one.
