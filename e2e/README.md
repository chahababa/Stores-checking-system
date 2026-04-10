# E2E Test Notes

This project uses Playwright for browser-level regression checks.

## Install the browser

Run this once on each machine that will execute Playwright:

```bash
npx playwright install chromium
```

## Run public smoke tests against local dev

Make sure `.env.local` is configured, then run:

```bash
npm run test:e2e
```

By default the Playwright config will start `npm run dev` and target `http://127.0.0.1:3000`.

## Run against an already deployed environment

Set:

```bash
PLAYWRIGHT_BASE_URL=https://stores-checking-system.zeabur.app
```

Then run:

```bash
npm run test:e2e
```

## Authenticated dashboard tests

The authenticated specs are optional and only run when a storage state file is provided.

Supported environment variables:

```bash
PLAYWRIGHT_OWNER_STORAGE_STATE=playwright/.auth/owner.json
PLAYWRIGHT_LEADER_STORAGE_STATE=playwright/.auth/leader.json
```

These files should contain Playwright storage state captured after a successful login for each role.

The initial authenticated coverage focuses on:

- owner dashboard visibility
- leader dashboard visibility
- leader navigation restrictions
