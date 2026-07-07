# H1.6A6 — Account Strategy Visibility Fix

This patch fixes the confusing source of the one-off campaign dropdowns.

## What was confusing

The one-off campaign form said the audience/buyer segment, service line, and offer dropdowns came from **Settings**.

That was not accurate from the user's point of view.

The data actually comes from the active workspace's **Account Strategy** section:

- Audiences
- Service Lines
- Offers

That manager exists on the account detail page, but it was buried under:

`/accounts/[accountId]#strategy`

## What this patch changes

### `/campaigns`

- Renames **Buyer Segment from Settings** to **Audience from Account Strategy**.
- Renames service line and offer labels to **from Account Strategy**.
- Adds a **Manage Account Strategy** button to the one-off campaign form.
- Changes helper text so users know audiences/service lines/offers are managed on the active account workspace.
- Changes metrics links from `/settings` to the active account strategy section.
- Changes setup-needed link from Settings to **Manage Account Strategy**.

### `/settings`

Adds a visible **Market Strategy** card that links to the active account's strategy manager.

This makes Settings useful as a hub without pretending the segment manager lives directly inside Settings.

### `/accounts/[accountId]`

Renames the account page section from **Strategy** to **Market Strategy** so the label matches the rest of the app.

## What this does NOT do

- No SQL.
- No schema changes.
- No changes to one-off campaign generation.
- No changes to Marketing Spine monthly generation.
- No new data is created automatically.

If the only audience shown is `Contractors`, that means the active workspace currently only has one audience in Account Strategy. After this patch, there is a visible path to add more.

## Apply order

Apply after H1.6A5 and the H1.6A5 build fix.

## Test checklist

1. Open `/campaigns`.
2. Confirm the form says **Account Strategy**, not Settings.
3. Confirm the button **Manage Account Strategy** appears.
4. Click it and confirm it opens `/accounts/[activeAccountId]#strategy`.
5. Add another audience.
6. Return to `/campaigns`.
7. Confirm the new audience appears in the dropdown.
8. Open `/settings`.
9. Confirm the new **Market Strategy** card appears.

## Commit message

`H1.6A6 Account Strategy visibility fix`
