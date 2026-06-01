# VIP Content Command Center

## Goal

Give `/content-calendar` a clear purpose.

Instead of being another crowded working page, `/content-calendar` becomes the content command center.

## Page Replaced

```text
src/app/(app)/content-calendar/page.tsx
```

## Component Added

```text
src/components/content-calendar/ContentCommandCenterMonthSelector.tsx
```

## Purpose

The page answers:

```text
Where are we?
What needs attention?
Where should I go next?
Is anything broken?
```

## What It Shows

```text
Month selector
campaign count
active asset count
assets needing quality review
review-ready assets
approved assets
published assets
recommended next actions
workflow map
health warnings
recent activity
```

## Important Product Decision

`/content-calendar` is now a dashboard / hub.

Detailed work happens on:

```text
/content-calendar/monthly
/content-calendar/monthly-review
/content-quality
/quality-automation
/approvals
/publishing-schedule
/published
```

## Apply

1. Add the month selector component.
2. Replace `/content-calendar/page.tsx`.
3. Commit.
4. Push.
5. Redeploy.

Suggested commit message:

```text
Turn content calendar into command center
```

## Test

1. Open `/content-calendar`.
2. Confirm it shows the current month.
3. Change the month.
4. Confirm counts change.
5. Confirm quick links route to the right pages.
6. Confirm health warnings are useful and not noisy.
