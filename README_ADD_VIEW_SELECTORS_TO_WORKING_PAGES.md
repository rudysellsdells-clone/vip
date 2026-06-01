# VIP Add View Selectors To Working Pages

## Problem

The selector utilities existed, but the actual page files were not rendering the selector.

## What This Patch Does

Adds:

```text
src/components/calendar/WorkingViewControls.tsx
```

Replaces:

```text
src/app/(app)/publishing-schedule/page.tsx
```

Includes:

```text
docs/integration/APPLY_WORKING_VIEW_SELECTOR_TO_EXISTING_PAGES.md
```

## Result

`/publishing-schedule` will show a visible Daily / Weekly / Monthly selector.

The selector card includes:

```text
View dropdown
Date picker
Today button
Daily button
Weekly button
Monthly button
visible count
total queue count
active view summary
```

## Important

The other pages need the same selector rendered inside their page files.

This package includes exact integration snippets for:

```text
/content-calendar/monthly
/content-calendar/monthly-review
/approvals
/content-quality
/quality-automation
/publishing-ready
```

## Apply

1. Add `WorkingViewControls.tsx`.
2. Replace `/publishing-schedule/page.tsx`.
3. Use the integration doc to add the same control to each remaining page.
4. Commit.
5. Push.
6. Redeploy.

Suggested commit message:

```text
Render view selectors on working pages
```

## Test

1. Open `/publishing-schedule`.
2. Confirm the selector is visible.
3. Switch Daily / Weekly / Monthly.
4. Confirm the visible count changes.
5. Apply the integration snippets to the next page.
