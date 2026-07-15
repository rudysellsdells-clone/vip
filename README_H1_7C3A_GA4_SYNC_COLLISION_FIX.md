# H1.7C3A — GA4 Sync Collision Fix

This is a small direct-unzip build fix for the GA4 synchronization error:

`duplicate key value violates unique constraint "analytics_daily_metrics_account_id_source_id_metric_date_di_key"`

## Root cause

GA4 can return multiple raw rows that differ before normalization but resolve to the same Marketing VIP campaign/content/term key. The reporting table correctly allows only one row for each account, source, date, and normalized dimension key. H1.7C2 attempted to insert those colliding normalized rows separately.

A second possible collision occurs when initial, manual, and scheduled synchronization jobs overlap for the same GA4 source.

## Fix

- Aggregates identical normalized GA4 metric keys before database insertion.
- Sums users, sessions, engagement, views, conversions, leads, and revenue across the merged rows.
- Records raw, aggregated, and merged-row counts in synchronization history.
- Closes stale running synchronization records older than 30 minutes.
- Prevents more than one running synchronization per analytics source.
- Returns a readable message when a synchronization is already running.

## Install

1. Unzip this patch directly into the repository root and choose **Replace**.
2. Run this migration in Supabase SQL Editor:

   `db/migrations/20260715_h1_7c3a_ga4_sync_collision_guard.sql`

3. Commit and push the code.
4. Wait for the Vercel production deployment.
5. Open the Rudy McCormick workspace, then go to **Measure → Analytics**.
6. Click **Sync Last 30 Days** once.

No existing analytics data needs to be deleted manually. The GA4 sync deletes and rebuilds only the selected source/date range after the normalized rows have been safely aggregated.

## Expected result

The synchronization completes without the unique-constraint error. Synchronization details may show `merged_collision_rows` greater than zero; that confirms the collision was safely combined rather than rejected.
