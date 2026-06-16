# H1.3F Accounts Reduced Corner Radius Polish

## Purpose

Reduce the rounded corners in the accounts area by roughly half so the interface feels more professional and less bubbly.

## Files changed

```text
src/components/accounts/AccountForms.module.css
```

## What changed

- Large account cards reduced from 24px radius to 12px.
- Mid-size inner boxes reduced from 18px radius to 9px.
- Inputs and textareas reduced from 16px radius to 8px.
- Account menu links reduced from 14px radius to 7px.

## Not changed

```text
No layout changes.
No padding changes.
No database changes.
No API changes.
No account logic changes.
No publishing changes.
```

## Test checklist

1. Open `/accounts`.
2. Open `/accounts/[accountId]`.
3. Confirm the account forms, menu card, overview cards, and inputs have less pronounced rounded corners.
4. Confirm the layout and spacing from H1.3E remain unchanged.
