# H1.4F — Production Cleanup + Legacy Surface Reduction

This patch cleans up development-era routes, confusing labels, and outdated navigation now that the account/workspace hardening pass is complete.

## What changed

- Simplified the main navigation into the current production workflow:
  - Dashboard
  - Campaigns
  - Content Calendar
  - Monthly Review
  - Quality Review
  - Approvals
  - Publish Center
  - Action History
  - Growth tools
  - Workspace setup
- Removed old development-era navigation entries for Phase Two and Reporting.
- Removed the old non-existent Published Content nav destination.
- Changed Quality Review navigation to use the canonical `/content-quality` route.
- Kept old bookmarked routes safe by redirecting them:
  - `/phase-two` → `/dashboard`
  - `/phase-two-reporting` → `/dashboard`
  - `/ready-for-publishing` → `/publishing-schedule`
  - `/quality-automation` → `/content-quality`
  - `/account` → `/accounts`
  - `/published` → `/actions`
- Cleaned settings cards so they only point to production-ready controls.
- Updated calendar workflow cards and status wording to use Publish Center / Action History language.
- Updated dashboard approved-content link to Publish Center instead of the old integrations page.

## What this patch does not change

- No SQL.
- No Supabase auth changes.
- No account-scope logic changes.
- No publishing provider logic changes.
- No ZapierMCP, Facebook, LinkedIn, WordPress, Gmail, GalaxyAI, calendar, or quality execution behavior changes.

## Test path

1. Deploy to Vercel.
2. Log in as MASTER.
3. Confirm the top navigation is simpler and no longer shows Phase Two, old Reporting, Published Content, or duplicate Quality Automation.
4. Visit these old URLs and confirm they redirect cleanly:
   - `/phase-two`
   - `/phase-two-reporting`
   - `/ready-for-publishing`
   - `/quality-automation`
   - `/account`
   - `/published`
5. Confirm normal workflows still open:
   - `/dashboard`
   - `/content-calendar`
   - `/content-calendar/monthly-review`
   - `/content-quality`
   - `/approvals`
   - `/publishing-schedule`
   - `/actions`
