# VIP Sprint 2.20 — Monthly Content Calendar View

## Goal

Add a real month-based calendar view for generated and planned content.

Rudy asked for:

```text
Monthly calendar view
Dropdown at the top to select month
Calendar populated with proposed/generated content inside day boxes
Only months with content in the dropdown
```

## New Page

```text
/content-calendar/monthly
```

## What It Shows

The page pulls from:

```text
content_calendar_items
generated_assets
```

and displays content inside calendar day boxes.

Each day can show:

```text
planned content calendar items
generated assets
asset type
status
time if scheduled
short description/content preview
link to asset or planner
```

## Month Dropdown

The dropdown is built from months where VIP has content based on:

```text
scheduled_publish_at
target_publish_at
publish_at
planned_date
created_at
```

## Files Included

```text
src/lib/content-calendar/monthly-calendar.ts
src/components/content-calendar/MonthSelector.tsx
src/components/content-calendar/MonthlyCalendarDayBox.tsx
src/app/(app)/content-calendar/monthly/page.tsx
src/components/layout/SidebarNav.tsx
README_MONTHLY_CONTENT_CALENDAR_VIEW_2_20.md
```

## No SQL Required

This uses existing content calendar and generated asset tables.

## Navigation

Adds:

```text
Command → Monthly Calendar
```

## Apply

1. Add/replace included files.
2. Commit.
3. Push.
4. Redeploy.

Suggested commit message:

```text
Add monthly content calendar view
```

## Test

1. Open:

```text
/content-calendar/monthly
```

2. Confirm the month dropdown appears.
3. Select a month with content.
4. Confirm day boxes populate with planned/generated content.
5. Click a generated asset from a day box.
6. Confirm it opens the asset.
7. Use `/publishing-schedule` to adjust times and confirm the monthly view reflects the schedule.

## Note

This is intentionally a viewing layer. It does not change the generator. It gives us a visual monthly control panel before we add drag-and-drop scheduling later.
