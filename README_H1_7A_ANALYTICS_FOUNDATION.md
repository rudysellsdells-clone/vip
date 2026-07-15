# H1.7A — Analytics Foundation

## Status

**Built:** direct-unzip patch created.

This patch establishes the native-first analytics contract while keeping GA4 as an external data source rather than the foundation of the product.

## Problem solved

Marketing VIP needs an account-scoped analytics system that can connect campaign strategy and generated assets to traffic, engagement, leads, conversions, and revenue. A GA4-only dashboard would be fast but would leave the product dependent on Google reporting definitions and API availability.

## Canonical ownership

- Account access remains owned by `src/lib/accounts/account-context.ts`.
- Database authorization remains owned by `public.user_can_view_account()` and `public.user_can_manage_account()`.
- Analytics event vocabulary is now owned by `src/lib/analytics/event-taxonomy.ts`.
- Cached analytics reporting is stored in `analytics_daily_metrics`.
- Raw native and imported event records are stored in `analytics_events`.

## Files added

- `db/migrations/20260715_h1_7a_analytics_foundation.sql`
- `src/lib/analytics/event-taxonomy.ts`
- `src/app/(app)/analytics/page.tsx`
- `src/app/(app)/analytics/Analytics.module.css`

No existing application files are replaced in this patch.

## Database model

### `analytics_data_sources`

Stores native and GA4 source configuration and synchronization status. OAuth secrets are deliberately not stored by this phase.

### `analytics_goals`

Stores account-specific engagement, lead, conversion, and revenue goals.

### `analytics_events`

Stores account-scoped raw events with optional campaign and generated-asset attribution.

### `analytics_daily_metrics`

Stores dashboard-ready cached summaries. Future native rollups and GA4 synchronization will write into this shared table.

## Installation

1. Unzip this patch directly into the repository root and choose **Replace** if prompted.
2. Apply `db/migrations/20260715_h1_7a_analytics_foundation.sql` in Supabase SQL Editor.
3. Confirm that the SQL finishes without an error.
4. Deploy through the normal GitHub/Vercel workflow.
5. Open `/analytics` while signed into an account workspace.

The migration must be applied before the page can show a ready state. The page intentionally renders a migration-required notice instead of crashing when the tables are absent.

## Verification checklist

### Build checks

- Run `npm run build`.
- Run `npm run typecheck` when practical.
- Confirm no new dependency installation is required.

### Account scope

- Open `/analytics` as the master user and switch between two accounts.
- Confirm each account shows only its own sources, goals, and metrics.
- Open `/analytics` as a client account user.
- Confirm the user can read the active account's analytics data.
- Confirm a non-manager cannot insert, update, or delete analytics records directly.

### Empty state

- With no source or metric rows, confirm the page displays zero totals and setup guidance.
- Confirm no false claims are made that GA4 or native collection is connected.

### Seed test

Optional temporary SQL for one account:

```sql
insert into public.analytics_data_sources (
  account_id,
  source_type,
  status,
  name,
  website_url
) values (
  '<ACCOUNT_UUID>',
  'native',
  'active',
  'Marketing VIP Native',
  'https://example.com'
);

insert into public.analytics_daily_metrics (
  account_id,
  source_id,
  metric_date,
  dimension_key,
  channel,
  users_count,
  sessions_count,
  engaged_sessions_count,
  page_views_count,
  leads_count,
  conversions_count,
  revenue
)
select
  '<ACCOUNT_UUID>',
  id,
  current_date,
  'channel:organic-search',
  'Organic Search',
  80,
  100,
  62,
  145,
  7,
  3,
  2400
from public.analytics_data_sources
where account_id = '<ACCOUNT_UUID>'
  and source_type = 'native'
limit 1;
```

Delete temporary data after visual verification.

## Rollback

Application rollback:

- Remove the two files under `src/app/(app)/analytics/`.
- Remove `src/lib/analytics/event-taxonomy.ts`.

Database rollback, only before production data exists:

```sql
drop table if exists public.analytics_daily_metrics cascade;
drop table if exists public.analytics_events cascade;
drop table if exists public.analytics_goals cascade;
drop table if exists public.analytics_data_sources cascade;
notify pgrst, 'reload schema';
```

Do not drop these tables after real analytics data has been collected. Disable the feature in the application instead.

## Next patch: H1.7B

H1.7B should add:

1. Account-specific site identifiers and rotating collection secrets.
2. A guarded server-side native event collection endpoint.
3. A lightweight JavaScript tracking snippet.
4. Native daily rollup processing.
5. Google OAuth authorization and GA4 property selection.
6. A navigation entry after the setup and data paths are operational.

The event names and reporting-table contract in H1.7A should remain stable through those additions.
