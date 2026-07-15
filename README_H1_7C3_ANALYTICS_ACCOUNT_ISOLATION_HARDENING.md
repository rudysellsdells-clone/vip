# H1.7C3 — Analytics Account-Isolation Hardening

## Purpose

H1.7C3 makes the Marketing VIP account boundary enforceable at the database, API, and user-interface layers.

Each Marketing VIP account can have:

- One Marketing VIP Native analytics source
- One independent Google Analytics 4 connection
- Its own encrypted Google credentials
- Its own selected GA4 account and property
- Its own imported metrics and synchronization history
- Its own goals, UTM settings, campaigns, assets, and tracking links

The Google OAuth client ID and secret remain application-wide Vercel settings. They identify Marketing VIP as the OAuth application. The authorization tokens, property selection, and reporting data remain account-specific.

## Dependencies

Apply these migrations first, in order:

1. `20260715_h1_7a_analytics_foundation.sql`
2. `20260715_h1_7b_analytics_collection_and_ga4.sql`
3. `20260715_h1_7c1_analytics_reporting_operations.sql`
4. `20260715_h1_7c2_utm_taxonomy_and_tracking_links.sql`
5. `20260715_h1_7c3_analytics_account_isolation_hardening.sql`

## What H1.7C3 adds

### Database enforcement

- A unique rule allowing only one `native` source and one `ga4` source per account
- Duplicate-source reconciliation before the unique rule is created
- An account-visible `analytics_source_merge_log`
- Source/account guards for:
  - OAuth credentials
  - Native events
  - Daily metrics
  - Synchronization runs
- Campaign and asset account guards for:
  - Events
  - Daily metrics
  - Tracking links
  - Publishing execution runs
- Tracking-link account validation on publishing runs
- An immutable analytics-source account assignment
- Exact checks that `vip_campaign` and `vip_asset` mirror the linked campaign and asset

### Duplicate-source reconciliation

If an account already has multiple rows of the same analytics source type, the migration:

1. Selects the strongest canonical source.
2. Prefers active and fully configured sources.
3. Prefers the most recently synchronized source.
4. Keeps the strongest OAuth credential.
5. Preserves one canonical daily metric for every date and dimension.
6. Moves event and sync history to the canonical source.
7. Records the removed and retained source IDs in `analytics_source_merge_log`.
8. Removes the duplicate source row.

The cleanup is intentionally performed before the unique database rule is created.

### Request-level account confirmation

Connection-changing requests now include the account ID shown on the page. The server compares it with the authenticated user’s current active account.

If the account changed in another tab or during a rapid workspace switch, the action is rejected with a refresh message instead of modifying the wrong client account.

This applies to:

- Native analytics setup
- GA4 property selection
- Manual GA4 synchronization
- Starting Google OAuth
- Replacing a Google authorization
- Disconnecting GA4

### User-interface safeguards

The Analytics connection panel now:

- Displays the active Marketing VIP account prominently
- Explains that the connection belongs only to that account
- Remounts when the active account changes
- Prevents old local form state from appearing in the newly selected account
- Warns before replacing an existing GA4 authorization
- Provides an account-scoped GA4 disconnect control
- Confirms that other Marketing VIP accounts are not affected

The goals, operations, and UTM taxonomy client panels also remount when the active account changes.

### Disconnect behavior

Disconnecting GA4:

- Removes the account’s stored encrypted Google credentials
- Clears the selected Google account and property
- Stops automatic synchronization
- Retains previously imported metrics and sync history
- Records the action in the activity log
- Does not affect another Marketing VIP account

Reconnect can later authorize the same or a different Google user and property for that account.

## Files added

- `db/migrations/20260715_h1_7c3_analytics_account_isolation_hardening.sql`
- `src/app/api/analytics/ga4/disconnect/route.ts`
- `README_H1_7C3_ANALYTICS_ACCOUNT_ISOLATION_HARDENING.md`

## Files replaced

- `src/lib/analytics/server.ts`
- `src/components/analytics/AnalyticsSetupPanel.tsx`
- `src/app/(app)/analytics/page.tsx`
- `src/app/(app)/analytics/Analytics.module.css`
- `src/app/(app)/analytics/taxonomy/page.tsx`
- `src/app/api/analytics/native/source/route.ts`
- `src/app/api/analytics/ga4/connect/route.ts`
- `src/app/api/analytics/ga4/property/route.ts`
- `src/app/api/analytics/ga4/sync/route.ts`

## Installation

### 1. Back up the analytics tables

The migration is data-preserving, but duplicate-source reconciliation changes source IDs and removes duplicate source rows. Create a Supabase backup or export these tables before applying it:

- `analytics_data_sources`
- `analytics_oauth_credentials`
- `analytics_events`
- `analytics_daily_metrics`
- `analytics_sync_runs`
- `analytics_tracking_links`

### 2. Extract the patch

Unzip the patch directly into the repository root and choose **Replace** when prompted.

### 3. Apply the migration

Run this file in Supabase SQL Editor:

```text
db/migrations/20260715_h1_7c3_analytics_account_isolation_hardening.sql
```

### 4. Deploy

Commit and push through GitHub Desktop. Confirm the Vercel production build succeeds.

No new environment variables are required.

## Verification checklist

### One source per account

Run:

```sql
select
  account_id,
  source_type,
  count(*) as source_count
from public.analytics_data_sources
group by account_id, source_type
having count(*) > 1;
```

Expected result: **zero rows**.

### Credential/source account consistency

```sql
select
  credential.id,
  credential.account_id as credential_account_id,
  source.account_id as source_account_id
from public.analytics_oauth_credentials credential
join public.analytics_data_sources source
  on source.id = credential.source_id
where credential.account_id is distinct from source.account_id;
```

Expected result: **zero rows**.

### Event/source account consistency

```sql
select event.id
from public.analytics_events event
join public.analytics_data_sources source
  on source.id = event.source_id
where event.account_id is distinct from source.account_id;
```

Expected result: **zero rows**.

### Metric/source account consistency

```sql
select metric.id
from public.analytics_daily_metrics metric
join public.analytics_data_sources source
  on source.id = metric.source_id
where metric.account_id is distinct from source.account_id;
```

Expected result: **zero rows**.

### Duplicate reconciliation audit

```sql
select
  account_id,
  source_type,
  kept_source_id,
  removed_source_id,
  merged_at
from public.analytics_source_merge_log
order by merged_at desc;
```

Zero rows means no duplicate source cleanup was necessary.

## Two-account functional test

1. Select Marketing VIP Account A.
2. Open **Measure → Analytics**.
3. Confirm the account-scope banner names Account A.
4. Connect Account A to its GA4 property.
5. Record the property name and ID.
6. Switch to Account B.
7. Confirm Account A’s property is not displayed.
8. Connect Account B to a different GA4 property.
9. Switch back to Account A.
10. Confirm Account A’s original property and data return.
11. Switch to Account B and disconnect GA4.
12. Confirm Account B stops synchronizing but its historical reporting remains.
13. Switch to Account A and confirm its GA4 connection is unchanged.

## Stale-tab test

1. Open Analytics for Account A in one browser tab.
2. Switch the active account to Account B in another tab.
3. Return to the old Account A tab without refreshing.
4. Try to update, sync, replace, or disconnect analytics.

Expected result: Marketing VIP rejects the request because the account shown in the stale tab no longer matches the authenticated active account.

## Cross-account database rejection test

Use real test UUIDs in a non-production environment. Attempt to insert an analytics event using Account A’s `account_id` and Account B’s `source_id`.

Expected result: the database raises an account-consistency exception and rejects the row.

Do not run destructive insert tests against production reporting unless the transaction is wrapped and rolled back.

## Rollback

### Application rollback

Restore the previous versions of all files listed under **Files replaced** and remove:

- `src/app/api/analytics/ga4/disconnect/route.ts`

### Database guard rollback

The following removes the new uniqueness and validation guards without deleting analytics data:

```sql
drop trigger if exists analytics_oauth_credentials_account_guard
  on public.analytics_oauth_credentials;
drop trigger if exists analytics_events_source_account_guard
  on public.analytics_events;
drop trigger if exists analytics_daily_metrics_source_account_guard
  on public.analytics_daily_metrics;
drop trigger if exists analytics_sync_runs_source_account_guard
  on public.analytics_sync_runs;
drop trigger if exists analytics_events_attribution_account_guard
  on public.analytics_events;
drop trigger if exists analytics_daily_metrics_attribution_account_guard
  on public.analytics_daily_metrics;
drop trigger if exists analytics_tracking_links_attribution_account_guard
  on public.analytics_tracking_links;
drop trigger if exists publishing_execution_runs_attribution_account_guard
  on public.publishing_execution_runs;
drop trigger if exists publishing_execution_runs_tracking_account_guard
  on public.publishing_execution_runs;
drop trigger if exists analytics_data_sources_account_immutable
  on public.analytics_data_sources;

drop function if exists public.analytics_assert_source_account();
drop function if exists public.analytics_assert_campaign_asset_account();
drop function if exists public.analytics_assert_tracking_link_account();
drop function if exists public.analytics_prevent_source_account_move();

drop index if exists public.analytics_data_sources_account_source_type_key;

alter table public.analytics_tracking_links
  drop constraint if exists analytics_tracking_links_vip_asset_matches_asset;
alter table public.analytics_tracking_links
  drop constraint if exists analytics_tracking_links_vip_campaign_matches_campaign;

notify pgrst, 'reload schema';
```

### Important rollback limitation

Duplicate sources merged by the migration cannot be automatically reconstructed from the retained source row. The merge log records what happened, but restoring the original duplicate rows requires the backup created before installation.

Do not drop `analytics_source_merge_log` during a normal rollback; it is the audit record of any reconciliation that occurred.
