# H1.3B Accounts Two-Column Form Layout Polish

## Purpose

Make the accounts area feel more professional and easier to use on desktop screens.

H1.3A improved spacing but was too conservative. H1.3B makes the actual layout change: normal account fields now use true two-column grids where there is room, while mobile remains one column.

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

- Added stronger shared account form layout classes.
- Normal fields now sit in a two-column grid on medium/desktop screens.
- Field wrappers now control readable field width instead of letting every control stretch across the page.
- Long-form fields can span both columns only when that improves readability.
- Create Account now uses one cohesive two-column grid.
- Brand Profile now groups short fields and textarea fields into a two-column desktop layout.
- Publishing Settings now groups platform settings into a two-column desktop layout.
- Market Profile add forms now use the same professional layout.
- Invite Member form remains compact but has better spacing and readable column widths.

## Not changed

```text
No database changes.
No API changes.
No account permission changes.
No publishing changes.
No business logic changes.
```

## Test checklist

1. Open `/accounts`.
2. Confirm Create Account fields appear in two columns on desktop.
3. Open an account detail page.
4. Confirm Brand Profile, Publishing Settings, and Market Profile add forms use two columns where there is room.
5. Confirm mobile still stacks fields in one column.
6. Save one harmless account/profile edit to confirm behavior still works.
