# VIP Add Selectors To All Working Pages

## What This Patch Does

This patch renders the daily / weekly / monthly selector on the main working pages.

## Files Included

```text
src/components/calendar/WorkingAssetCard.tsx
src/components/calendar/WorkingAssetGroups.tsx
src/lib/calendar/page-assets.ts
src/app/(app)/content-calendar/monthly/page.tsx
src/app/(app)/content-calendar/monthly-review/page.tsx
src/app/(app)/approvals/page.tsx
src/app/(app)/content-quality/page.tsx
src/app/(app)/quality-automation/page.tsx
src/app/(app)/publishing-ready/page.tsx
README_ADD_SELECTORS_TO_ALL_WORKING_PAGES.md
```

## Pages Updated

```text
/content-calendar/monthly
/content-calendar/monthly-review
/approvals
/content-quality
/quality-automation
/publishing-ready
```

`/publishing-schedule` was patched in the previous package.

## Behavior

Each page now has:

```text
Daily / Weekly / Monthly selector
Date picker
Today button
visible count
total queue count
day-grouped asset cards
lifecycle filtering
date-window filtering
```

## Important

These are full page replacements based on the current VIP working-view direction.

If any of your existing pages contain specialized buttons or logic that you want preserved, merge the selector pattern into that existing page rather than replacing the whole file.

## Product Rules Preserved

These pages should only show:

```text
active latest version
not archived
not superseded
not published
inside selected day/week/month
```

## Apply

1. Add the shared components.
2. Add `page-assets.ts`.
3. Replace the listed page files.
4. Commit.
5. Push.
6. Redeploy.

Suggested commit message:

```text
Add working view selectors to all content pages
```

## Test

For each page:

1. Open the page.
2. Confirm selector appears.
3. Switch to Daily.
4. Switch to Weekly.
5. Switch to Monthly.
6. Confirm old versions do not reappear.
7. Confirm published items do not reappear.
8. Confirm counts change logically.
