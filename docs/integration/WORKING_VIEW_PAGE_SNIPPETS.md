# Working View Selector Page Snippets

Use these snippets to add the daily / weekly / monthly selector to each working page.

## Shared Imports

```ts
import { CalendarViewSelector } from "@/components/calendar/CalendarViewSelector";
import { WorkingViewSummary } from "@/components/calendar/WorkingViewSummary";
import {
  buildCalendarViewRangeFromSearchParams,
  filterAssetsByViewRange,
  groupAssetsByDay,
} from "@/lib/calendar/view-range";
import { defaultViewForPage } from "@/lib/calendar/working-view-config";
```

## Shared Page Props

```ts
type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};
```

## Build The Range

```ts
const resolvedSearchParams = searchParams ? await searchParams : {};

const range = buildCalendarViewRangeFromSearchParams({
  searchParams: resolvedSearchParams,
  defaultView: defaultViewForPage("publishing-schedule"),
});
```

Replace `"publishing-schedule"` with:

```text
content-calendar
monthly-review
approvals
content-quality
quality-automation
publishing-ready
```

## Add Selector Section

```tsx
<WebsiteSection
  eyebrow="View"
  title={range.label}
  description="Switch between daily, weekly, and monthly views."
>
  <div className={websiteStyles.cardGrid}>
    <article className={websiteStyles.card}>
      <CalendarViewSelector
        basePath="/publishing-schedule"
        view={range.view}
        dateValue={range.dateValue}
      />
    </article>
  </div>
</WebsiteSection>
```

Change `basePath` per page:

```text
/publishing-schedule
/content-calendar/monthly
/content-calendar/monthly-review
/approvals
/content-quality
/quality-automation
/publishing-ready
```

## Filter Visible Assets

After lifecycle filtering:

```ts
const allWorkingAssets = filterWorkingAssets(safeRows(data));
const visibleAssets = filterAssetsByViewRange(allWorkingAssets, range);
const groups = groupAssetsByDay(visibleAssets);
```

For publishing schedule:

```ts
const allWorkingAssets = filterPublishingScheduleAssets(safeRows(data));
const visibleAssets = filterAssetsByViewRange(allWorkingAssets, range);
const groups = groupAssetsByDay(visibleAssets);
```

## Add Summary

```tsx
<WorkingViewSummary
  range={range}
  visibleCount={visibleAssets.length}
  totalCount={allWorkingAssets.length}
/>
```

## Recommended Defaults

```text
/publishing-schedule: week
/content-calendar/monthly: month
/content-calendar/monthly-review: month
/approvals: week
/content-quality: week
/quality-automation: week
/publishing-ready: day
```

Every page still has the selector, so the default only controls the first view.
