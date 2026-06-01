# VIP Universal Working View Selector

## Goal

Add daily / weekly / monthly selectors to every working content page.

Defaults still matter, but every page should let users switch views.

## Files Included

```text
src/lib/calendar/view-range.ts
src/components/calendar/CalendarViewSelector.tsx
src/components/calendar/WorkingViewSummary.tsx
src/lib/calendar/working-view-config.ts
docs/integration/WORKING_VIEW_PAGE_SNIPPETS.md
README_UNIVERSAL_WORKING_VIEW_SELECTOR.md
```

## Pages To Integrate

```text
/publishing-schedule
/content-calendar/monthly
/content-calendar/monthly-review
/approvals
/content-quality
/quality-automation
/publishing-ready
```

## Default Views

```text
/publishing-schedule: week
/content-calendar/monthly: month
/content-calendar/monthly-review: month
/approvals: week
/content-quality: week
/quality-automation: week
/publishing-ready: day
```

## User-Controlled Views

Every page supports:

```text
?view=day&date=2026-06-01
?view=week&date=2026-06-01
?view=month&date=2026-06-01
```

## Product Rule

The selector controls time window only.

Lifecycle filtering still controls which assets are eligible to appear:

```text
active latest version
not archived
not superseded
not published
correct status for the page
```

## Apply

1. Add/replace the files in this package.
2. Apply the integration snippets to each page one at a time.
3. Start with `/publishing-schedule`.
4. Then move to:
   - `/content-calendar/monthly`
   - `/approvals`
   - `/content-quality`
   - `/quality-automation`
   - `/content-calendar/monthly-review`
   - `/publishing-ready`

Suggested commit message:

```text
Add universal daily weekly monthly view selector
```

## Test

For each page:

1. Open the page with no query params.
2. Confirm the default view is correct.
3. Switch to Daily.
4. Switch to Weekly.
5. Switch to Monthly.
6. Confirm the same lifecycle rules still apply.
7. Confirm old/superseded/published assets do not reappear.
