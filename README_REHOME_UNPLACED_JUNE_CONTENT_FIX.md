# VIP Rehome Unplaced June Content Fix

## Problem

The monthly calendar loads records but June still appears empty.

The June page showed:

```text
Loaded 0 campaign(s), 7 asset(s), and 84 planned item(s) before month filtering.
```

That means the data exists, but the 84 planned items do not have usable calendar metadata.

They are probably missing:

```text
intended_publish_month
planned_publish_date
scheduled_publish_at
campaign_week_start_date
```

So the calendar cannot safely place them in June.

## What This Fix Does

### 1. SQL rehomes unplaced records to June

Run:

```text
db/migrations/20260524_rehome_unplaced_june_content.sql
```

It targets unplaced recent records and assigns them:

```text
intended_publish_month = 2026-06
planned_publish_date
scheduled_publish_at
campaign_week_number
campaign_week_start_date
calendar_sort_order
```

It updates both:

```text
content_calendar_items
generated_assets
```

### 2. Calendar page now shows unplaced records

The monthly calendar now includes an **Unplaced Records** section.

So records with missing calendar metadata will no longer disappear.

## Files Included

```text
db/migrations/20260524_rehome_unplaced_june_content.sql
src/app/(app)/content-calendar/monthly/page.tsx
README_REHOME_UNPLACED_JUNE_CONTENT_FIX.md
```

## Apply

1. Replace the page file.
2. Run SQL:

```text
db/migrations/20260524_rehome_unplaced_june_content.sql
```

3. Commit.
4. Push.
5. Redeploy.

Suggested commit message:

```text
Rehome unplaced June calendar content
```

## Test

1. Open:

```text
/content-calendar/monthly?month=2026-06
```

2. Confirm June shows planned items.
3. Confirm the **Unplaced** metric drops.
4. Confirm the calendar day boxes populate.
5. If anything is still unplaced, it will show in the Unplaced Records section instead of disappearing.

## Note

This is a repair for the current generated June data. Going forward, the monthly campaign generator should write these fields at creation time.
