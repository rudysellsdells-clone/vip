# VIP Safe Calendar Fields + Backfill

## Problem

Supabase returned:

```text
ERROR: 42703: column ga.intended_publish_month does not exist
```

## Cause

The backfill SQL was run before the schema migration that adds the campaign-aware calendar fields.

## Fix

Run this combined safe migration instead:

```text
db/migrations/20260524_safe_campaign_calendar_fields_and_backfill.sql
```

It does both steps:

```text
1. Adds missing calendar/campaign fields
2. Backfills existing records
```

## What It Adds

To `campaigns`:

```text
campaign_month
campaign_week_number
campaign_week_start_date
campaign_week_end_date
planned_start_date
planned_end_date
calendar_notes
metadata
```

To `generated_assets`:

```text
intended_publish_month
planned_publish_date
campaign_week_number
campaign_week_start_date
calendar_sort_order
calendar_notes
```

To `content_calendar_items`:

```text
intended_publish_month
planned_publish_date
campaign_id
campaign_week_number
campaign_week_start_date
calendar_sort_order
calendar_notes
```

## Apply

1. Open Supabase SQL Editor.
2. Paste and run:

```text
db/migrations/20260524_safe_campaign_calendar_fields_and_backfill.sql
```

3. Then redeploy the app if you have not already.
4. Open:

```text
/content-calendar/monthly
```

5. Select June.

Suggested commit message:

```text
Add safe calendar fields and backfill
```
