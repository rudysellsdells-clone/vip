# H1.3A Accounts UI Form Polish

## Purpose

Clean up the accounts area forms so fields do not stretch across the full page and labels/fields have more comfortable spacing.

## Files changed

```text
src/components/accounts/accountFormClasses.ts
src/components/accounts/CreateAccountForm.tsx
src/components/accounts/AccountBrandProfileForm.tsx
src/components/accounts/AccountPublishingSettingsForm.tsx
src/components/accounts/InviteAccountMemberForm.tsx
src/components/accounts/AccountMarketProfileManager.tsx
```

## What changed

- Added shared account form class constants.
- Limited account form cards to a readable max width.
- Limited fields to readable field widths instead of stretching full page width.
- Added tighter but intentional label/field spacing using `space-y-[5px]`.
- Increased grid row/column breathing room on account forms.
- Kept mobile layout full-width where appropriate.
- Kept all API calls and account logic unchanged.

## Not changed

```text
No database changes.
No account logic changes.
No API route changes.
No publishing changes.
No permissions changes.
```

## Test checklist

1. Open `/accounts`.
2. Confirm the Create Account form is no longer overly wide.
3. Confirm labels and fields have comfortable spacing.
4. Open an account detail page.
5. Confirm Brand Profile, Publishing Settings, Market Profile, and Invite Member forms look cleaner.
6. Submit a harmless edit to confirm existing form behavior still works.
