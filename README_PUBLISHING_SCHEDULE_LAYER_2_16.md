# VIP Sprint 2.16 — Publishing Schedule Layer

## Goal

Prevent monthly content from publishing all at once.

This sprint adds publish date/time fields and a publishing schedule page so content can be staggered across the month.

## New SQL

Run this migration in Supabase:

```text
db/migrations/20260523_publishing_schedule_fields.sql
```

It adds scheduling fields to:

```text
generated_assets
content_calendar_items
```

Fields:

```text
scheduled_publish_at
publish_timezone
scheduling_status
scheduling_notes
```

## New Page

```text
/publishing-schedule
```

## What It Does

The page lets you:

```text
see schedulable assets
assign a monthly schedule
manually change publish date/time
see scheduled vs unscheduled assets
route approved assets toward Publishing Ready
```

## Monthly Cadence

Default schedule spreads assets across the week:

```text
Tuesday morning — blog/content anchor
Tuesday afternoon — LinkedIn
Wednesday — Facebook / white paper / authority
Thursday — email / What-If outreach
Friday — video/media prompt
```

## Files Included

```text
db/migrations/20260523_publishing_schedule_fields.sql
src/lib/publishing-schedule/defaults.ts
src/lib/publishing-schedule/scheduler.ts
src/app/api/publishing-schedule/assign-month/route.ts
src/app/api/assets/[assetId]/schedule/route.ts
src/components/publishing-schedule/AssignMonthlyScheduleButton.tsx
src/components/publishing-schedule/ScheduleAssetButton.tsx
src/app/(app)/publishing-schedule/page.tsx
src/components/layout/SidebarNav.tsx
README_PUBLISHING_SCHEDULE_LAYER_2_16.md
```

## Navigation

Adds:

```text
Command → Publishing Schedule
```

## Apply

1. Add/replace included files.
2. Run SQL migration.
3. Commit.
4. Push.
5. Redeploy.

Suggested commit message:

```text
Add publishing schedule layer
```

## Test

1. Run the SQL migration.
2. Open:

```text
/publishing-schedule
```

3. Confirm assets appear.
4. Select a month/year.
5. Click:

```text
Assign Monthly Schedule
```

6. Confirm assets receive publish date/time values.
7. Adjust one asset manually.
8. Confirm the saved time persists after refresh.

## Important Note

The first version schedules assets by `created_at` month. Later, we can tighten this to schedule by content calendar plan month or campaign month once we want more exact calendar-plan scoping.
