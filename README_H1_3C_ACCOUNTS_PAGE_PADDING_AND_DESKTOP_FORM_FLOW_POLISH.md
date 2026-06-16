# H1.3C Accounts Page Padding and Desktop Form Flow Polish

## Purpose

Continue polishing the accounts user experience so it feels more professional and easier to use.

H1.3B introduced the stronger two-column form approach. H1.3C adds more breathing room around the page and containers, and makes the desktop/mobile behavior more intentional.

## Files changed

```text
src/components/accounts/accountFormClasses.ts
src/components/accounts/AccountMarketProfileManager.tsx
src/components/website-ui/WebsitePage.module.css
```

This patch also carries forward the H1.3B account form files so the layout stays consistent:

```text
src/components/accounts/CreateAccountForm.tsx
src/components/accounts/AccountBrandProfileForm.tsx
src/components/accounts/AccountPublishingSettingsForm.tsx
src/components/accounts/InviteAccountMemberForm.tsx
src/components/accounts/AccountMarketProfileManager.tsx
```

## What changed

- Adds more left-side page padding on desktop.
- Adds slightly more page padding on mobile without making the page feel cramped.
- Adds more padding inside website sections, cards, hero panels, and metrics.
- Adds more padding inside account form containers.
- Uses a desktop-only two-column form grid with `lg:grid-cols-2`.
- Keeps mobile/tablet layouts stacked until there is enough room for two columns.
- Keeps long/wide fields capped so they do not stretch across the whole page.

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
2. Confirm the page has a bit more left-side breathing room.
3. Confirm form/card containers have more interior padding.
4. Confirm account fields move to two columns on desktop.
5. Resize to mobile and confirm fields stack cleanly.
6. Open `/accounts/[accountId]` and check Brand Profile, Publishing Settings, Market Profile, and Invite Member forms.
