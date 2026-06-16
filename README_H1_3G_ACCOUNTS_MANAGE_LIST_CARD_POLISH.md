# H1.3G Accounts Manage List Card Polish

## Purpose

Apply the same polished account-area treatment to the “Accounts you can manage” section on `/accounts`.

## Files changed

```text
src/components/accounts/AccountForms.module.css
src/app/(app)/accounts/page.tsx
```

## What changed

- Replaces the large bubbly account cards with reduced-radius, padded account cards.
- Adds more internal padding to each managed account card.
- Converts the top account-card content into a true two-column desktop layout.
- Keeps the account card stacked on mobile.
- Converts the account detail values into a cleaner two-column details grid on desktop.
- Reduces rounded corners on the action panel and member table wrapper.
- Keeps existing account actions and member table behavior unchanged.

## Not changed

```text
No database changes.
No API changes.
No account logic changes.
No permission changes.
No publishing changes.
```

## Test checklist

1. Open `/accounts`.
2. Scroll to “Accounts you can manage.”
3. Confirm each account card has more padding and less pronounced corners.
4. Confirm account details use two columns on desktop.
5. Confirm the action panel sits to the right on desktop.
6. Confirm the card stacks cleanly on mobile.
