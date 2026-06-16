# H1.3D Accounts Explicit CSS Layout Enforcement

## Purpose

The previous Tailwind-constant patches were too indirect and did not create enough visible change in production. H1.3D makes the accounts UI polish explicit by using a dedicated CSS module for account pages and account forms.

## Files changed

```text
src/components/accounts/AccountForms.module.css
src/components/accounts/CreateAccountForm.tsx
src/components/accounts/AccountBrandProfileForm.tsx
src/components/accounts/AccountPublishingSettingsForm.tsx
src/components/accounts/InviteAccountMemberForm.tsx
src/components/accounts/AccountMarketProfileManager.tsx
src/app/(app)/accounts/page.tsx
src/app/(app)/accounts/[accountId]/page.tsx
src/app/(app)/account/page.tsx
```

## What changed

- Adds an accounts-only CSS module instead of relying on Tailwind class constants.
- Adds explicit left-side padding to account pages.
- Adds explicit padding inside account form cards and strategy panels.
- Forces desktop account forms into two columns with CSS grid.
- Forces mobile/narrow screens to stack into one column.
- Keeps long fields capped and readable instead of stretching across the entire page.
- Keeps all account logic, API calls, and database behavior unchanged.

## Not changed

```text
No database changes.
No API changes.
No permission changes.
No publishing changes.
No account business logic changes.
```

## Test checklist

1. Open `/accounts`.
2. Confirm page content has more left-side breathing room.
3. Confirm Create Account is clearly two columns on desktop.
4. Open `/accounts/[accountId]`.
5. Confirm Brand Profile, Publishing Settings, and Market Profile forms use two columns on desktop.
6. Resize to mobile and confirm fields stack into one column.
7. Confirm saving still works.
