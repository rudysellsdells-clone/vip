# VIP Monthly Campaign Review Board

## Goal

After a monthly campaign package is generated, Rudy needs a faster way to review the full month without opening every asset one at a time from the calendar.

This sprint adds a monthly review board.

## New Page

```text
/content-calendar/monthly-review
```

Supports:

```text
/content-calendar/monthly-review?month=2026-06
```

## What It Shows

```text
month selector
workflow readiness card
monthly asset counts
channel mix counts
weekly campaign groups
asset cards grouped by campaign/week
status badges
schedule dates
content previews
links to assets, quality, approvals, and schedule
```

## Why This Is Next

The monthly generator can now create 52–65 assets. The next bottleneck is operational review.

This page gives a clear view of:

```text
what exists
what needs review
what is approved
what is scheduled
what may be missing
```

## Files Included

```text
src/lib/content-calendar/monthly-review.ts
src/components/content-calendar/ReviewMonthSelector.tsx
src/components/content-calendar/MonthlyReviewStatusCard.tsx
src/app/(app)/content-calendar/monthly-review/page.tsx
README_MONTHLY_CAMPAIGN_REVIEW_BOARD.md
```

## Optional Navigation

Add a sidebar/menu link to:

```text
/content-calendar/monthly-review
```

Recommended label:

```text
Monthly Review
```

## No SQL Required

This reads existing campaigns and generated assets.

## Apply

1. Add the monthly review helper.
2. Add the two components.
3. Add the new page.
4. Commit.
5. Push.
6. Redeploy.

Suggested commit message:

```text
Add monthly campaign review board
```

## Test

1. Generate or use an existing campaign month.
2. Open:

```text
/content-calendar/monthly-review?month=2026-06
```

3. Confirm the correct asset counts appear.
4. Confirm assets are grouped by campaign/week.
5. Open an asset from the review board.
6. Confirm links to Quality, Approvals, Schedule, and Monthly Calendar work.

## Note

This is intentionally read/action navigation first. Bulk review/approval actions can come next once this board is stable.
