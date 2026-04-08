# Open Items

## Must Finish Before Production

- Restore `gh` authentication and push the repository to GitHub
- Fill real environment values in `.env.local` or the production host
- Configure Google OAuth with the final production callback URL
- Apply all Supabase migrations to the production project
- Run `supabase/seed.sql` in the production project
- Create real manager and leader accounts
- Execute the full smoke test in `GO_LIVE_CHECKLIST.md`

## Strongly Recommended

- Add route and server-action integration tests for the most critical flows
- Add a second round of inspection workflow tests around edit, lock, and delete
- Review seed content with the business owner and replace any placeholder operational wording
- Decide whether seed content should remain English or be replaced with final production naming
- Confirm backup / recovery expectations for Supabase database and storage

## Nice to Have

- Dashboard-style home page
- More visual charts in reports
- PDF export or print-friendly report format
- LINE integration and notifications
- Photo library / standard-photo browsing experience

## Push Blocker Detail

Current `gh auth status` result on this machine reports:

- active account: `chahababa`
- token in keyring is invalid
- recommended fix: `gh auth login -h github.com`

After that is fixed, the remaining GitHub steps are straightforward:

1. Initialize local git repo if needed
2. Create or connect the target GitHub repository
3. Commit the current beta state
4. Push `main`
