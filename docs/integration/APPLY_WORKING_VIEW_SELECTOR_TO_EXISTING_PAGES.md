# Apply Working View Selector To Existing Pages

The prior package added reusable selector components, but pages only show the selector after each page renders it.

This patch includes a full `/publishing-schedule` replacement and a reusable component:

```text
src/components/calendar/WorkingViewControls.tsx
```

Use the same pattern on every working page.

## Required imports per page

```ts
import { WorkingViewControls } from "@/components/calendar/WorkingViewControls";
import {
  buildCalendarViewRangeFromSearchParams,
  filterAssetsByViewRange,
  groupAssetsByDay,
} from "@/lib/calendar/view-range";
import { defaultViewForPage } from "@/lib/calendar/working-view-config";
```

If the page is filtering assets by lifecycle, also use:

```ts
import { filterWorkingAssets } from "@/lib/assets/asset-visibility";
```

## Page Props

Ensure the page accepts search params:

```ts
type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};
```

## Build the range

At the top of the page component:

```ts
const resolvedSearchParams = searchParams ? await searchParams : {};

const range = buildCalendarViewRangeFromSearchParams({
  searchParams: resolvedSearchParams,
  defaultView: defaultViewForPage("approvals"),
});
```

Change the page key:

```text
publishing-schedule
content-calendar
monthly-review
approvals
content-quality
quality-automation
publishing-ready
```

## Filter the page assets

After loading assets:

```ts
const allWorkingAssets = filterWorkingAssets(safeRows(data));
const visibleAssets = filterAssetsByViewRange(allWorkingAssets, range);
const groups = groupAssetsByDay(visibleAssets);
```

For publishing schedule:

```ts
const allWorkingAssets = filterPublishingScheduleAssets(safeRows(data));
const visibleAssets = filterAssetsByViewRange(allWorkingAssets, range);
```

## Render the selector

Put this near the top of the page, below the hero:

```tsx
<WebsiteSection
  eyebrow="View"
  title={range.label}
  description="Switch between daily, weekly, and monthly views."
>
  <WorkingViewControls
    basePath="/approvals"
    range={range}
    visibleCount={visibleAssets.length}
    totalCount={allWorkingAssets.length}
    title="Approval view"
    visibleLabel="In View"
    totalLabel="Approval Queue"
  />
</WebsiteSection>
```

Change `basePath` and labels per page.

## Recommended Page Settings

### /content-calendar/monthly

```tsx
<WorkingViewControls
  basePath="/content-calendar/monthly"
  range={range}
  visibleCount={visibleAssets.length}
  totalCount={allWorkingAssets.length}
  title="Calendar view"
  visibleLabel="In View"
  totalLabel="Calendar Items"
/>
```

Default:

```ts
defaultViewForPage("content-calendar")
```

### /content-calendar/monthly-review

```tsx
<WorkingViewControls
  basePath="/content-calendar/monthly-review"
  range={range}
  visibleCount={visibleAssets.length}
  totalCount={allWorkingAssets.length}
  title="Review board view"
  visibleLabel="In View"
  totalLabel="Review Items"
/>
```

Default:

```ts
defaultViewForPage("monthly-review")
```

### /approvals

```tsx
<WorkingViewControls
  basePath="/approvals"
  range={range}
  visibleCount={visibleAssets.length}
  totalCount={allWorkingAssets.length}
  title="Approval view"
  visibleLabel="In View"
  totalLabel="Approval Queue"
/>
```

Default:

```ts
defaultViewForPage("approvals")
```

### /content-quality

```tsx
<WorkingViewControls
  basePath="/content-quality"
  range={range}
  visibleCount={visibleAssets.length}
  totalCount={allWorkingAssets.length}
  title="Quality view"
  visibleLabel="In View"
  totalLabel="Quality Queue"
/>
```

Default:

```ts
defaultViewForPage("content-quality")
```

### /quality-automation

```tsx
<WorkingViewControls
  basePath="/quality-automation"
  range={range}
  visibleCount={visibleAssets.length}
  totalCount={allWorkingAssets.length}
  title="Quality automation view"
  visibleLabel="In View"
  totalLabel="Automation Queue"
/>
```

Default:

```ts
defaultViewForPage("quality-automation")
```

### /publishing-ready

```tsx
<WorkingViewControls
  basePath="/publishing-ready"
  range={range}
  visibleCount={visibleAssets.length}
  totalCount={allWorkingAssets.length}
  title="Publishing-ready view"
  visibleLabel="In View"
  totalLabel="Ready Items"
/>
```

Default:

```ts
defaultViewForPage("publishing-ready")
```

## Why this is split

The full page structures differ across the app, so this package safely adds:
- a guaranteed publishing schedule implementation
- a reusable selector card
- exact snippets for the rest of the pages

If you want all pages patched directly, paste one page file at a time and apply the same pattern.
