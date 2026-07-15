# H1.7C1 — Analytics Reporting and Operations

## Status

**Built:** direct-unzip patch created.

H1.7C1 turns the H1.7A/H1.7B analytics foundation into an operational reporting product. It adds scheduled native and GA4 synchronization, persistent sync history, retry visibility, reporting filters, campaign and asset drill-down pages, and conversion-goal management.

This patch intentionally does **not** modify publishing payloads yet. Automatic injection of `vip_campaign` and `vip_asset` parameters across all canonical publishing links is reserved for H1.7C2 so reporting can be verified before publishing behavior changes.

## Dependencies

Apply these releases in order:

1. H1.7A analytics foundation
2. H1.7B analytics collection and GA4 connection
3. H1.7C1 analytics reporting and operations

The existing H1.7B environment variables remain required:

```text
ANALYTICS_ENCRYPTION_KEY
GOOGLE_ANALYTICS_CLIENT_ID
GOOGLE_ANALYTICS_CLIENT_SECRET
GOOGLE_ANALYTICS_REDIRECT_URI
NEXT_PUBLIC_APP_URL
CRON_SECRET
```

No new environment variables are introduced in H1.7C1.

## What this patch adds

### Automated analytics operations

- Daily Vercel Cron invocation at `11:15 UTC`
- Secured `/api/analytics/scheduled-sync` endpoint
- Native rollup for yesterday and today
- GA4 incremental refresh for the most recent three days
- Maximum of 50 due sources per scheduled invocation
- Source-level next-sync scheduling
- Automatic source health updates

Vercel sends the configured `CRON_SECRET` as an Authorization bearer token. The endpoint rejects requests without an exact match.

### Synchronization history

Every native rollup and GA4 synchronization now creates an account-scoped record containing:

- Source
- Source type
- Trigger type: initial, manual, scheduled, or retry
- Date range
- Running, completed, or failed status
- Rows processed
- Start and completion timestamps
- Error details

Failed runs can be retried from the Analytics screen by an account owner or administrator.

### Reporting controls

The main Analytics dashboard now supports:

- Last 7, 30, or 90 days
- All sources
- Marketing VIP Native only
- GA4 only
- Filter-preserving links into detailed views

### Campaign performance

The main dashboard aggregates native metrics by `campaign_id` and links to:

```text
/analytics/campaigns/[campaignId]
```

Each campaign view includes:

- Sessions
- Page views
- Leads
- Conversions
- Conversion rate
- Attributed revenue
- Channel performance
- Asset performance
- Recent native events

### Asset performance

The main dashboard aggregates native metrics by `asset_id` and links to:

```text
/analytics/assets/[assetId]
```

Each asset view includes:

- Sessions
- Page views
- Leads
- Conversions
- Conversion rate
- Attributed revenue
- Channel mix
- Recent native events

### Conversion-goal management

Account owners and administrators can now:

- Create goals from the canonical Marketing VIP event taxonomy
- Assign goal type: engagement, lead, conversion, or revenue
- Set a default monetary value
- Mark one goal as primary
- Pause or activate a goal
- Delete a goal

The account/event uniqueness rule from H1.7A remains in place, so an account cannot create duplicate goals for the same event name.

## Files added

- `README_H1_7C1_ANALYTICS_REPORTING_OPERATIONS.md`
- `db/migrations/20260715_h1_7c1_analytics_reporting_operations.sql`
- `src/lib/analytics/reporting.ts`
- `src/lib/analytics/sync-runs.ts`
- `src/lib/analytics/native-rollup.ts`
- `src/components/analytics/AnalyticsGoalsPanel.tsx`
- `src/components/analytics/AnalyticsOperationsPanel.tsx`
- `src/app/api/analytics/goals/route.ts`
- `src/app/api/analytics/scheduled-sync/route.ts`
- `src/app/api/analytics/sync-runs/[runId]/retry/route.ts`
- `src/app/(app)/analytics/campaigns/[campaignId]/page.tsx`
- `src/app/(app)/analytics/assets/[assetId]/page.tsx`

## Files replaced

- `vercel.json`
- `src/lib/analytics/ga4-sync.ts`
- `src/app/api/analytics/rollup/route.ts`
- `src/app/api/analytics/ga4/sync/route.ts`
- `src/app/api/analytics/ga4/property/route.ts`
- `src/app/(app)/analytics/page.tsx`
- `src/app/(app)/analytics/Analytics.module.css`

## Installation order

1. Confirm H1.7A and H1.7B are deployed and GA4 data is visible.
2. Unzip this patch directly into the repository root.
3. Choose **Replace** for the files listed under “Files replaced.”
4. Apply this migration in the Supabase SQL Editor:

```text
db/migrations/20260715_h1_7c1_analytics_reporting_operations.sql
```

5. Confirm `CRON_SECRET` is still present in the Vercel Production environment.
6. Commit and push through GitHub Desktop.
7. Confirm the Vercel production build succeeds.
8. Open **Measure → Analytics**.

The database migration should be applied before using the new Analytics screen. Until it is applied, the page will show an H1.7C migration warning.

## Vercel Cron configuration

The patch replaces `vercel.json` and preserves the existing framework/build settings while adding:

```json
"crons": [
  {
    "path": "/api/analytics/scheduled-sync",
    "schedule": "15 11 * * *"
  }
]
```

Cron jobs are registered on production deployments. The route validates:

```text
Authorization: Bearer <CRON_SECRET>
```

Do not expose the `CRON_SECRET` in client-side code.

## Verification checklist

### Build

- Run `npm run build`.
- Run `npm run typecheck` when practical.
- Confirm no new npm packages are required.
- Confirm Vercel registers one production Cron Job.

### Database

Confirm these fields exist on `analytics_data_sources`:

- `auto_sync_enabled`
- `sync_frequency`
- `next_sync_at`

Confirm `analytics_sync_runs` exists and authenticated users can only select account-scoped rows.

Confirm `analytics_goals` includes:

- `description`
- `updated_by`

### Manual synchronization

1. Open Analytics.
2. Select **Refresh Native Metrics** or **Sync Last 30 Days**.
3. Reload the screen.
4. Confirm a completed manual record appears under Synchronization Health.

### Scheduled synchronization

After the production cron runs:

1. Confirm a `scheduled` sync record appears.
2. Confirm native and GA4 sources receive updated `last_synced_at` values.
3. Confirm `next_sync_at` moves to the next daily window.

### Failure and retry

1. Temporarily create a safe test failure, such as connecting a test GA4 credential that has expired.
2. Confirm the sync run is marked failed and displays the error.
3. Correct the connection.
4. Select **Retry**.
5. Confirm a new retry run completes successfully.

Do not intentionally alter production OAuth credentials solely to test this behavior.

### Reporting filters

- Switch among 7, 30, and 90 days.
- Switch among All, Native, and GA4.
- Confirm URL search parameters update.
- Confirm campaign and asset links preserve the selected view.

### Account scope

- Switch between two accounts.
- Confirm sync runs, goals, campaigns, assets, and metrics remain isolated.
- Confirm viewers can read reporting but cannot change goals or retry runs.

## Current attribution behavior

H1.7B already recognizes valid native URL parameters:

```text
vip_campaign=<campaign UUID>
vip_asset=<generated asset UUID>
```

H1.7C1 reports those identifiers when they are present. H1.7C2 will update canonical publishing-link creation so eligible outbound links receive these parameters automatically.

## Rollback

### Application rollback

Restore the previous H1.7B versions of:

- `vercel.json`
- `src/lib/analytics/ga4-sync.ts`
- `src/app/api/analytics/rollup/route.ts`
- `src/app/api/analytics/ga4/sync/route.ts`
- `src/app/api/analytics/ga4/property/route.ts`
- `src/app/(app)/analytics/page.tsx`
- `src/app/(app)/analytics/Analytics.module.css`

Remove the H1.7C1-only files listed under “Files added.”

### Database rollback

The safest rollback after real sync history exists is to leave the additive schema in place and restore the application files.

Before any H1.7C1 sync history or goal metadata exists, the additive database changes can be removed with:

```sql
drop table if exists public.analytics_sync_runs cascade;

drop index if exists public.analytics_daily_metrics_asset_idx;

alter table public.analytics_data_sources
  drop constraint if exists analytics_data_sources_sync_frequency_check,
  drop column if exists auto_sync_enabled,
  drop column if exists sync_frequency,
  drop column if exists next_sync_at;

alter table public.analytics_goals
  drop column if exists description,
  drop column if exists updated_by;

notify pgrst, 'reload schema';
```

After real data exists, do not drop the history table solely to roll back the UI.

## Next patch: H1.7C2

H1.7C2 should integrate the analytics attribution helper into canonical publishing output and link-building paths so campaign and asset identifiers are added consistently without duplicating URLs or damaging existing UTM parameters.
