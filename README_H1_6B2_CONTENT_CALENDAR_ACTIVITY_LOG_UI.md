# H1.6B2 — Content Calendar Activity Log UI

This patch changes the Activity block on `/content-calendar` from card-style tiles into a cleaner chronological log list.

## What this fixes

The old block said:

- Activity
- Recent content activity
- A quick log of recent content system activity.

But the UI displayed the items as cards, which did not feel like a log.

## What this changes

On `/content-calendar`:

- Changes eyebrow from **Activity** to **Activity Log**.
- Keeps the title **Recent content activity**.
- Changes the description to **A chronological log of recent content system events.**
- Displays activity as a vertical log list instead of cards.
- Adds:
  - timestamp
  - activity type badge
  - title
  - description
  - timeline rail/dot styling

## Files changed

- `src/app/(app)/content-calendar/page.tsx`
- `src/components/website-ui/WebsitePage.module.css`

## SQL required

None.

## Apply order

Apply after the H1.6A and H1.6B prompt patches.

## Test checklist

1. Open `/content-calendar`.
2. Scroll to **Activity Log**.
3. Confirm recent activity displays as a chronological log list.
4. Confirm empty state still works if there is no activity.
5. Confirm other website-style cards/pages still look normal.

## Commit message

`H1.6B2 Content Calendar activity log UI`
