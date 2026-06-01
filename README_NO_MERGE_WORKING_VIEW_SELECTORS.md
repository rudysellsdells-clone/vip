# VIP No-Merge Working View Selectors Package

## Purpose

This package is intended to remove the need for manual merging.

Use this as a copy/replace package for the working view selector cleanup.

## What To Do

Copy the included files into the same paths in your project.

Do not manually merge unless a file contains custom logic you know you need to preserve.

## Included Areas

This package includes the shared selector system plus page-level replacements for:

```text
/publishing-schedule
/content-calendar/monthly
/content-calendar/monthly-review
/approvals
/content-quality
/quality-automation
/publishing-ready
```

## Shared Components Included

```text
src/lib/calendar/view-range.ts
src/lib/calendar/working-view-config.ts
src/components/calendar/CalendarViewSelector.tsx
src/components/calendar/WorkingViewSummary.tsx
src/components/calendar/WorkingViewControls.tsx
src/components/calendar/WorkingAssetCard.tsx
src/components/calendar/WorkingAssetGroups.tsx
src/lib/calendar/page-assets.ts
```

## Page Files Included

```text
src/app/(app)/publishing-schedule/page.tsx
src/app/(app)/content-calendar/monthly/page.tsx
src/app/(app)/content-calendar/monthly-review/page.tsx
src/app/(app)/approvals/page.tsx
src/app/(app)/content-quality/page.tsx
src/app/(app)/quality-automation/page.tsx
src/app/(app)/publishing-ready/page.tsx
```

## Expected Result

Each page should show:

```text
Daily / Weekly / Monthly selector
Date picker
Today button
Visible count
Total queue count
Grouped asset cards
```

## Important

If a page loses a button or function that you still need, do not try to fix it manually. Send the issue back and patch that specific page from the replacement version.

## Suggested Commit Message

```text
Apply no-merge working view selectors
```

## Test Checklist

1. Deploy.
2. Open `/publishing-schedule`.
3. Confirm selector still appears.
4. Open `/content-calendar/monthly`.
5. Confirm selector appears.
6. Open `/content-calendar/monthly-review`.
7. Confirm selector appears.
8. Open `/approvals`.
9. Confirm selector appears.
10. Open `/content-quality`.
11. Confirm selector appears.
12. Open `/quality-automation`.
13. Confirm selector appears.
14. Open `/publishing-ready`.
15. Confirm selector appears.
16. Switch each page between Daily, Weekly, and Monthly.
