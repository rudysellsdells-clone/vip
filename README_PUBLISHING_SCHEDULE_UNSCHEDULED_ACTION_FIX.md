# VIP Publishing Schedule Unscheduled Action Fix

## Problem

Approved assets with no publish date were appearing under a day group because the old date logic fell back to `created_at`.

That made a no-date asset look like it was scheduled for today, while also showing a `No date` tag.

## Product Rule

If an asset appears on `/publishing-schedule`, it should be actionable.

Approved assets with no publish date should appear in:

```text
Unscheduled / Publish Now
```

They should not be grouped under today's date just because they were created today.

## What This Patch Adds

```text
src/lib/calendar/publishing-schedule-view.ts
src/app/(app)/publishing-schedule/page.tsx
README_PUBLISHING_SCHEDULE_UNSCHEDULED_ACTION_FIX.md
```

## Behavior

`/publishing-schedule` now:

```text
uses scheduled_publish_at or planned_publish_date for date grouping
does not use created_at as a fake publishing date
shows no-date approved assets in Unscheduled / Publish Now
keeps unscheduled approved assets visible across daily/weekly/monthly views
labels no-date assets as No date — publish now
includes a Send to Zapier link on every card
includes an Add date link on no-date cards
```

## Important

The `Send to Zapier` link routes to:

```text
/publishing-ready?asset=[assetId]
```

The actual Zapier execution should happen from that page/flow.

## Apply

1. Add `src/lib/calendar/publishing-schedule-view.ts`.
2. Replace `src/app/(app)/publishing-schedule/page.tsx`.
3. Commit.
4. Push.
5. Redeploy.

Suggested commit message:

```text
Show unscheduled approved assets as publish now
```

## Test

1. Open `/publishing-schedule`.
2. Find the LinkedIn post with no date.
3. Confirm it appears under `Unscheduled / Publish Now`.
4. Confirm it has `No date — publish now`.
5. Confirm it has `Send to Zapier`.
6. Click `Send to Zapier`.
7. Confirm it opens `/publishing-ready?asset=[assetId]`.
