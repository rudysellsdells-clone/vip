# VIP Phase 3C — Account Context, Brand/Publishing Settings, and UI Polish

## Purpose

This patch builds on the working Phase 3B accounts foundation.

It adds:

- Active account selector in the app header
- Account context loader
- Account detail page
- Per-account brand profile
- Per-account publishing settings
- Cleaner account workspace UI
- More page padding / visual polish
- SQL migration for account brand and publishing tables

This patch does **not** refactor every campaign and asset query yet. It creates the account context and configuration foundation first so the next pass can safely scope specific screens by active account.

## Files included

```text
db/migrations/20260603_phase3c_account_context_brand_publishing.sql
src/app/(app)/layout.tsx
src/app/(app)/accounts/page.tsx
src/app/(app)/accounts/[accountId]/page.tsx
src/app/(app)/settings/page.tsx
src/app/api/accounts/route.ts
src/app/api/accounts/active/route.ts
src/app/api/accounts/[accountId]/archive/route.ts
src/app/api/accounts/[accountId]/brand-profile/route.ts
src/app/api/accounts/[accountId]/members/route.ts
src/app/api/accounts/[accountId]/publishing-settings/route.ts
src/components/accounts/AccountBrandProfileForm.tsx
src/components/accounts/AccountPublishingSettingsForm.tsx
src/components/accounts/AccountSwitcher.tsx
src/components/accounts/ArchiveAccountButton.tsx
src/components/accounts/CreateAccountForm.tsx
src/components/accounts/InviteAccountMemberForm.tsx
src/components/layout/AppShell.tsx
src/components/layout/SidebarNav.tsx
src/components/layout/SidebarNav.module.css
src/components/website-ui/WebsitePage.module.css
src/lib/accounts/account-context.ts
src/lib/accounts/account-utils.ts
```

## SQL migration

Run this in Supabase:

```text
db/migrations/20260603_phase3c_account_context_brand_publishing.sql
```

It creates:

```text
account_brand_profiles
account_publishing_settings
```

and adds RLS policies that use the Phase 3B account access functions:

```text
public.user_can_view_account(account_id)
public.user_can_manage_account(account_id)
```

## User-visible changes

### Account switcher

The app header now shows an active account selector. Selecting an account updates:

```text
profiles.last_active_account_id
profiles.default_account_id
```

### Account detail page

Each account now has a detail page:

```text
/accounts/[accountId]
```

It includes:

- Overview metrics
- Brand profile form
- Publishing settings form
- Members table
- Invite member form
- Remove/archive account button

### Brand profile per account

Each account can store:

- Company / brand name
- Website
- Primary CTA
- Phone
- Target audience
- Tone
- Service areas
- Core offers
- Approved hashtags
- Notes

### Publishing settings per account

Each account can store:

- LinkedIn Page name
- LinkedIn Company ID
- Facebook Page name
- Facebook Page ID
- Primary booking URL
- GalaxyAI creative style
- Default hashtags

### UI polish

The app shell and WebsitePage spacing are padded and softened so the UI feels less cramped.

## Suggested commit message

```text
Add Phase 3C account context and workspace settings
```

## Next recommended patch

After this builds cleanly:

```text
Scope campaign and asset list queries to the selected active account.
```

That should be done one screen at a time so the publishing baseline remains stable.
