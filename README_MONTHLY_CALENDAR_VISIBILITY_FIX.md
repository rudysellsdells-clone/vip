# VIP Monthly Calendar Visibility Fix

## Problem

Rudy had 98 generated items, but:

```text
June did not show in the month selector
No generated content was visible on the monthly calendar
```

## Likely Cause

The records exist, but the calendar was too strict about where it looked for the month/date.

Some generated content may have been missing one or more of:

```text
intended_publish_month
planned_publish_date
scheduled_publish_at
campaign_week_start_date
```

If those fields are empty, the old calendar could fall back to `created_at`, which makes June content look like May content if it was generated in May.

## Fixes Included

### 1. Backfill SQL

Run:

```text
db/migrations/20260524_backfill_campaign_calendar_fields.sql
```

This copies campaign month/week context onto generated assets and calendar items.

It also fills:

```text
planned_publish_date
intended_publish_month
```

from `scheduled_publish_at` when possible.

### 2. More forgiving monthly calendar logic

Replaces:

```text
src/lib/content-calendar/campaign-aware-monthly-calendar.ts
```

The calendar now looks at:

```text
campaign_month
intended_publish_month
planned_publish_date
scheduled_publish_at
target_publish_at
publish_at
planned_date
campaign week start
campaign fallback date
created_at as last resort
```

### 3. Month selector always includes rolling months

The dropdown now includes content months plus a rolling window from:

```text
6 months back
12 months forward
```

So June will appear even before perfect metadata exists.

### 4. Better default month

If there is no `?month=` parameter, the page now defaults to the nearest month with content instead of blindly defaulting to the current month.

## Files Included

```text
db/migrations/20260524_backfill_campaign_calendar_fields.sql
src/lib/content-calendar/campaign-aware-monthly-calendar.ts
src/app/(app)/content-calendar/monthly/page.tsx
README_MONTHLY_CALENDAR_VISIBILITY_FIX.md
```

## Apply

1. Add/replace included files.
2. Run SQL:

```text
db/migrations/20260524_backfill_campaign_calendar_fields.sql
```

3. Commit.
4. Push.
5. Redeploy.

Suggested commit message:

```text
Fix monthly calendar content visibility
```

## Test

1. Open:

```text
/content-calendar/monthly
```

2. Select June from the dropdown.
3. Confirm calendar metrics show loaded records.
4. Confirm generated assets appear in the June day boxes.
5. If June still looks empty, check the “All Loaded Records” card:
   - If it shows assets loaded, date mapping is the issue.
   - If it shows 0 assets loaded, query/filtering or archive status is the issue.
