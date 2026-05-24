# VIP Monthly Generator Assets-First Fix

## Problem

The content planner is creating some generation output, but it is not producing usable generated assets on the monthly calendar.

The calendar shows records in **Unplaced Records**, which means records exist but lack enough calendar metadata to appear in a month/day box.

## Root Cause

The generation flow was too fragile around schema/cache issues. If calendar metadata fields failed, the process could leave behind planned records without usable generated assets.

## Fix

This patch changes the monthly generator to be **assets-first**:

```text
Create campaign
→ Create real generated_assets records
→ Apply calendar metadata to those assets
→ Return asset count and any warnings
```

If Supabase/PostgREST has a schema cache issue with a newer calendar column, the route now falls back to creating the generated asset anyway, then tries to update calendar fields after.

That means we should not lose the asset creation step.

## Files Included

```text
src/app/api/content-calendar/monthly-campaigns/generate/route.ts
db/migrations/20260524_monthly_generator_assets_first_fields.sql
db/migrations/20260524_optional_clear_recent_unplaced_planned_items.sql
README_MONTHLY_GENERATOR_ASSETS_FIRST_FIX.md
```

## Required SQL

Run this first:

```text
db/migrations/20260524_monthly_generator_assets_first_fields.sql
```

It ensures the required calendar fields exist and refreshes schema cache.

## Optional Cleanup SQL

If you want to remove old broken/unplaced planned records from the last two weeks, run:

```text
db/migrations/20260524_optional_clear_recent_unplaced_planned_items.sql
```

Use this only if those records are test clutter.

## Apply

1. Replace the route file.
2. Run required SQL.
3. Optional: run cleanup SQL.
4. Commit.
5. Push.
6. Redeploy.

Suggested commit message:

```text
Make monthly generator create assets first
```

## Test

1. Clear June test data if needed.
2. Open:

```text
/content-calendar/monthly?month=2026-06
```

3. Generate June campaigns.
4. Confirm result says:

```text
Created 5 campaign(s) and 65 asset(s)
```

or for a 4-week month:

```text
Created 4 campaign(s) and 52 asset(s)
```

5. Confirm generated assets appear in June day boxes.
6. If warnings appear, they should tell us which calendar field still needs attention.
