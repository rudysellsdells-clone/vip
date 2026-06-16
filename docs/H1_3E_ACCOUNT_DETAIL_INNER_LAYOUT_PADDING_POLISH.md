# H1.3E Account Detail Inner Layout Padding Polish

## Purpose

H1.3D fixed the account forms, but the account detail inner layout still felt pushed too far left in the menu/overview/brand-profile area. H1.3E targets that account detail layout directly.

## Files changed

```text
src/components/accounts/AccountForms.module.css
src/app/(app)/accounts/[accountId]/page.tsx
```

## What changed

- Adds explicit padding to the account detail setup grid.
- Gives the Account Menu card more internal padding.
- Gives the Active Workspace box more internal padding.
- Gives the Overview / Brand Profile / Strategy / Publishing / Team / Danger Zone sections a dedicated padded card class.
- Gives overview info tiles more padding.
- Keeps the side menu sticky on wide screens.
- Keeps the detail layout stacked on narrower screens.

## Not changed

```text
No database changes.
No API changes.
No account logic changes.
No permissions changes.
No publishing changes.
```

## Test checklist

1. Open an account detail page such as `/accounts/[accountId]`.
2. Confirm the Account Menu is no longer tight against the left.
3. Confirm the Active Workspace box has more breathing room.
4. Confirm Overview, Workspace Snapshot, Brand Profile, and related sections sit comfortably inside padded cards.
5. Confirm mobile/narrow layout still stacks cleanly.
