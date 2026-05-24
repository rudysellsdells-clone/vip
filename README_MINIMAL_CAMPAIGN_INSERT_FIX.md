# VIP Minimal Campaign Insert Fix

## Problem

June generation failed with:

```text
Created 0 campaign(s) and 0 asset(s).

Week 1: Could not find the 'description' column of 'campaigns' in the schema cache
```

Earlier, the database also showed that `campaigns.title` does not exist.

## Cause

The monthly campaign generator was trying to insert optional campaign fields that your actual `campaigns` table does not expose:

```text
title
description
calendar_notes
```

## Fix

This patch replaces:

```text
src/app/api/content-calendar/monthly-campaigns/generate/route.ts
```

The generator now uses a minimal campaign insert:

```text
user_id
name
campaign_month
campaign_week_number
campaign_week_start_date
campaign_week_end_date
planned_start_date
planned_end_date
metadata
```

All campaign details are stored safely inside:

```text
metadata
```

## SQL Included

Run this safe SQL before testing again:

```text
db/migrations/20260524_minimal_campaign_generator_required_fields.sql
```

It ensures the fields used by the generator exist and refreshes Supabase schema cache.

## Files Included

```text
src/app/api/content-calendar/monthly-campaigns/generate/route.ts
db/migrations/20260524_minimal_campaign_generator_required_fields.sql
README_MINIMAL_CAMPAIGN_INSERT_FIX.md
```

## Apply

1. Replace the route file.
2. Run SQL:

```text
db/migrations/20260524_minimal_campaign_generator_required_fields.sql
```

3. Commit.
4. Push.
5. Redeploy.

Suggested commit message:

```text
Use minimal campaign insert for monthly generator
```

## Test

1. Clear the June test data if needed.
2. Open:

```text
/content-calendar/monthly?month=2026-06
```

3. Generate June campaigns again.
4. Confirm campaigns/assets are created.
5. Confirm June calendar boxes populate.
