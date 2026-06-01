# VIP Calendar / Review View Modes

## Goal

Clean up busy working pages by allowing daily, weekly, and monthly views.

This is especially helpful for:

```text
/publishing-schedule
/content-calendar/monthly
/content-quality
/quality-automation
/approvals
/monthly-review
```

## What This Adds

```text
src/lib/calendar/view-range.ts
src/components/calendar/CalendarViewSelector.tsx
src/app/(app)/publishing-schedule/page.tsx
README_CALENDAR_REVIEW_VIEW_MODES.md
```

## View Params

Pages can use:

```text
?view=day&date=2026-06-01
?view=week&date=2026-06-01
?view=month&date=2026-06-01
```

Default view is:

```text
week
```

## Shared Helpers

Import:

```ts
import {
  buildCalendarViewRange,
  filterAssetsByViewRange,
  groupAssetsByDay,
} from "@/lib/calendar/view-range";
```

Build the range:

```ts
const range = buildCalendarViewRange({
  view: firstValue(searchParams.view),
  date: firstValue(searchParams.date) ?? firstValue(searchParams.month),
});
```

Filter assets:

```ts
const visibleAssets = filterAssetsByViewRange(assets, range);
```

Group for display:

```ts
const groups = groupAssetsByDay(visibleAssets);
```

## Selector Component

Import:

```ts
import { CalendarViewSelector } from "@/components/calendar/CalendarViewSelector";
```

Use:

```tsx
<CalendarViewSelector
  basePath="/publishing-schedule"
  view={range.view}
  dateValue={range.dateValue}
/>
```

## Publishing Schedule Behavior

The included `/publishing-schedule` replacement now shows only:

```text
approved
active latest version
not archived
not superseded
not published
within selected day/week/month
```

## Recommended Default Views

```text
/publishing-schedule: week
/content-calendar/monthly: month
/monthly-review: week or month
/approvals: week
/content-quality: week
/quality-automation: week
```

## Product Benefit

This lets a user move between:

```text
Today: What needs action now?
This week: What is coming up?
This month: What is the campaign picture?
```

without changing the underlying lifecycle rules.

## Apply

1. Add `view-range.ts`.
2. Add `CalendarViewSelector.tsx`.
3. Replace `/publishing-schedule/page.tsx`.
4. Commit.
5. Push.
6. Redeploy.

Suggested commit message:

```text
Add daily weekly monthly working views
```

## Next Integration

After publishing schedule is stable, apply the same selector/range filter to:

```text
/content-calendar/monthly
/approvals
/content-quality
/quality-automation
/monthly-review
```
