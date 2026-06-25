# H1.4D4 — Calendar + Quality Account Scope

This patch tightens the content calendar and quality-review layer so it follows the same workspace/account boundary now used by Dashboard, Approvals, Assets, and Publishing.

## What changed

### Calendar planning and generation

- Calendar plan generation now saves `account_id` on `content_calendar_plans`.
- Calendar item generation now saves `account_id` on `content_calendar_items`.
- Individual calendar item generation checks the active workspace before creating campaigns or assets.
- Weekly calendar package generation checks the active workspace before creating campaigns or assets.
- Legacy unassigned calendar plans/items can only be rescued by MASTER users and are assigned to the active workspace before generation.
- Calendar item status updates are guarded by active workspace access.

### Monthly campaign package routes

- Monthly generation diagnostics now counts campaigns by active workspace, not just the logged-in user.
- Monthly generation duplicate checks are account-scoped.
- Bulk quality review and auto-quality review now update active-workspace assets even when those assets were originally created by MASTER.
- Delete-month cleanup now uses active workspace campaigns/assets and blocks completed publishing runs before destructive cleanup.

### Quality review and gate routes

- Latest quality review lookups are scoped through the already-authorized asset instead of requiring the current user to be the original review creator.
- Latest quality-gate lookups are scoped through the already-authorized asset.
- Quality gate decisions and resubmission actions can operate on active-workspace assets even if MASTER created the review.
- Asset lifecycle replacement helpers can now scope mutations by `account_id` instead of only `user_id`.

### Database migration

Adds `account_id` to:

- `content_calendar_plans`
- `content_calendar_items`

Backfills account IDs where possible from linked campaigns/items/plans.

Adds account-aware RLS policies for:

- `content_calendar_plans`
- `content_calendar_items`
- `asset_quality_reviews`
- `quality_gate_decisions`

The older user-owned policies are intentionally preserved as a legacy fallback for old unassigned rows.

## What did not change

This patch does **not** change:

- Publishing provider execution logic
- ZapierMCP payload shapes
- Facebook/LinkedIn/WordPress/Gmail/GalaxyAI live provider logic
- Content generation prompt strategy
- Campaign strategy generation logic
- Navigation labels or layout

## Required SQL

Run the included migration after deploying the patch:

`db/migrations/20260623_h1_4d4_calendar_quality_account_scope.sql`

This migration depends on the H1.4C helper functions already added to Supabase:

- `public.user_can_view_account(account_id)`
- `public.user_can_manage_account(account_id)`

## Suggested validation

1. Sign in as MASTER.
2. Select the Marketing VIP workspace.
3. Open `/content-calendar` and confirm the active workspace is correct.
4. Open `/content-calendar/monthly-review` and confirm only active workspace assets appear, plus MASTER-only legacy unassigned rescue items if any exist.
5. Run a safe bulk quality review from Monthly Review.
6. Open `/content-quality` and confirm quality results appear for active workspace assets.
7. Generate one safe calendar item or week package.
8. Confirm the generated campaigns/assets are assigned to the active workspace.
9. Sign in as a client/account user.
10. Confirm the client only sees their workspace calendar/quality content.
11. Confirm client users cannot update or generate legacy unassigned calendar items.

## Rollback

Code rollback: revert the files in this patch.

SQL rollback is intentionally not destructive. The migration adds nullable account columns and additive policies. If rollback is needed, disable the new policies manually rather than dropping `account_id` columns, because those columns may contain useful workspace ownership data after the patch is used.
