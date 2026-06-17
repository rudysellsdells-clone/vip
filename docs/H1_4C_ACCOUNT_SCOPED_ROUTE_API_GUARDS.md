# H1.4C Account-Scoped Route and API Guard Cleanup

## Purpose

H1.4A made navigation role-aware. H1.4C starts enforcing that model underneath the UI.

The main rule is now:

```text
Navigation is not security. Account-owned pages and APIs must check account access before reading or writing account data.
```

## What changed

### Shared account access helpers

Updated:

```text
src/lib/accounts/account-context.ts
src/lib/accounts/account-utils.ts
```

New shared account access behavior:

- Resolves account access from the same account context used by navigation.
- Treats MASTER-style platform roles consistently:
  - `master`
  - `owner`
  - `admin`
  - `platform_owner`
  - `platform_admin`
- Allows account `owner` and `admin` roles to manage their own account.
- Allows account members to view their own account.
- Centralizes `userCanViewAccount` and `userCanManageAccount` so account APIs no longer invent separate permission rules.

### Account workspace page/API guards

Updated:

```text
src/app/(app)/accounts/page.tsx
src/app/(app)/accounts/[accountId]/page.tsx
src/app/api/accounts/route.ts
src/app/api/accounts/[accountId]/archive/route.ts
src/app/api/accounts/[accountId]/members/route.ts
```

Now:

- `/accounts` only loads accounts available through the signed-in user’s account context.
- `/accounts/[accountId]` checks account access before loading workspace details.
- `/api/accounts` only returns accounts and memberships for accessible accounts.
- Account archive/member APIs use the shared account access helper.
- MASTER users keep platform-level account management access.
- Account owners/admins keep management access to their own accounts.

### Campaign account scoping

Updated:

```text
src/app/(app)/campaigns/page.tsx
src/app/(app)/campaigns/[campaignId]/page.tsx
src/app/api/campaigns/route.ts
src/app/api/campaigns/[campaignId]/route.ts
src/app/api/campaigns/[campaignId]/generate/route.ts
src/app/api/campaigns/[campaignId]/archive/route.ts
src/app/api/campaigns/[campaignId]/delete/route.ts
src/app/api/campaigns/[campaignId]/restore/route.ts
```

Now:

- Campaign list/form data is scoped to the active account.
- Campaign creation writes `account_id` from the active account.
- Campaign detail/API reads validate account access when `account_id` is present.
- Legacy campaigns with no `account_id` retain the previous `user_id` fallback.
- Campaign archive/delete/restore/generate routes check account management access before writing.
- Generated campaign assets inherit the campaign `account_id`.

### Database/RLS support

Added:

```text
db/migrations/20260616_h1_4c_account_scope_route_api_guards.sql
```

The migration:

- Adds `public.user_is_platform_master()`.
- Updates `public.user_can_view_account()` and `public.user_can_manage_account()` to respect MASTER-style platform roles.
- Adds account-aware RLS policies for:
  - campaigns
  - generated_assets
  - digital_clone_profiles
  - brand_rules
  - content_examples
  - knowledge_sources
  - galaxyai_runs
  - tool_runs
  - activity_log

Legacy `user_id` policies are intentionally left in place for older rows and backward compatibility.

## What was not changed

This patch does not change:

- LinkedIn/Facebook/Gmail provider execution logic.
- Zapier MCP payload shapes.
- Publishing success guards.
- Content generation prompt logic.
- GalaxyAI provider logic.
- Calendar generation logic.

## Important remaining hardening

H1.4C is a strong foundation, but VIP still has additional user-owned legacy routes that should be converted in later slices.

Recommended follow-up:

```text
H1.4D — Account-scope remaining asset, approval, publishing, calendar, quality, prospect, and action-history routes.
```

High-priority remaining areas:

- Asset approve/reject/revise/archive/restore routes.
- Publishing execution routes beyond the campaign-level guard work.
- Approval and quality-review pages/APIs.
- Calendar and monthly campaign APIs.
- Prospects/opportunities if those become account-scoped client data.
- Legacy Zapier/tool-run APIs.

## Test checklist

After applying the ZIP patch and running the SQL migration:

1. Sign in as the MASTER user.
2. Open `/accounts` and confirm all managed non-archived accounts are visible.
3. Open a specific account workspace from `/accounts/[accountId]`.
4. Switch active account in the account switcher.
5. Open `/campaigns` and confirm only the active account’s campaigns and dropdown options appear.
6. Create a campaign and confirm the new row has `account_id` set to the active account.
7. Generate campaign assets and confirm generated assets inherit the campaign `account_id`.
8. Archive and restore a campaign from its detail page.
9. Sign in as an account owner/admin and confirm they can access only their account workspace.
10. As an account user, manually type another account’s `/accounts/[accountId]` URL and confirm access is denied/redirected.
11. As an account user, call `/api/accounts` and confirm it returns only accessible accounts.
12. As an account user, attempt to archive or modify another account through an API request and confirm VIP returns 403.

## Rollback

Code rollback:

- Revert the files listed above to the previous repository version.

Database rollback:

- Drop the H1.4C policies created in the migration if needed.
- Restore the prior `user_can_view_account` and `user_can_manage_account` function definitions from the Phase 3B migration.

Because this migration is additive and legacy user-owned policies remain, rollback should rarely be needed.
