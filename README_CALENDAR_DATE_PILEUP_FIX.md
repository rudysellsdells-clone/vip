# VIP Calendar Date Pileup Fix

## Problem

Generated June campaign assets were showing on today's date in May.

That happened because the monthly calendar fell back to:

```text
created_at
```

when campaign/planning fields were missing.

That fallback is wrong for strategic content calendars because created date is not publish date.

## Fix

This patch does two things:

### 1. Stops the calendar from using `created_at` as a display date

Replaces:

```text
src/lib/content-calendar/campaign-aware-monthly-calendar.ts
```

Generated assets now display only when they have one of:

```text
planned_publish_date
scheduled_publish_at
campaign_week_start_date + calendar_sort_order
intended_publish_month / campaign_month fallback
```

They no longer pile onto today's date just because they were generated today.

### 2. Repairs the June 2026 generated batch

Run:

```text
db/migrations/20260524_repair_june_campaign_calendar_dates.sql
```

This repairs June campaign content by:

```text
marking June campaigns as campaign_month = 2026-06
setting campaign week numbers
setting week start/end dates
copying month/week context to generated assets
assigning calendar sort orders
assigning planned publish dates
assigning scheduled publish times
```

## Files Included

```text
db/migrations/20260524_repair_june_campaign_calendar_dates.sql
src/lib/content-calendar/campaign-aware-monthly-calendar.ts
README_CALENDAR_DATE_PILEUP_FIX.md
```

## Apply

1. Replace the calendar helper file.
2. Run the June repair SQL.
3. Commit.
4. Push.
5. Redeploy.

Suggested commit message:

```text
Fix calendar date pileup
```

## Test

1. Open:

```text
/content-calendar/monthly?month=2026-06
```

2. Confirm June assets appear across their campaign weeks.
3. Confirm they are no longer all on today's May date.
4. Check `/publishing-schedule` and confirm June assets have scheduled times.

## Note

This repair SQL is intentionally focused on June 2026 because that is the broken generated batch in testing.
Future generated batches should write the planning fields directly when created.
