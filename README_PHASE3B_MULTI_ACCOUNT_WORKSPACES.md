# VIP Phase 3B Multi-Account Workspaces Patch

## Purpose

This patch adds the foundation for true separate client/brand accounts, not just seats under one user account.

It supports the product direction:

- Rudy/VIP owner can create separate accounts/workspaces.
- Each account can have an owner and invited members.
- Account memberships support roles: owner, admin, editor, reviewer, viewer.
- Existing users get a default workspace/account.
- Existing campaigns/assets get an `account_id` foundation field for future scoping.
- The current publishing/GalaxyAI/Zapier baseline is not refactored by this patch.

## Files included

```text
db/migrations/20260603_phase3b_multi_account_workspaces.sql
src/lib/accounts/account-utils.ts
src/app/api/accounts/route.ts
src/app/api/accounts/[accountId]/members/route.ts
src/components/accounts/CreateAccountForm.tsx
src/components/accounts/InviteAccountMemberForm.tsx
src/app/(app)/accounts/page.tsx
src/components/layout/SidebarNav.tsx
src/app/(app)/settings/page.tsx
```

## What this adds

### Database

New tables:

```text
accounts
account_memberships
```

New profile fields:

```text
platform_role
default_account_id
last_active_account_id
```

Core content tables receive optional `account_id` fields, including:

```text
campaigns
generated_assets
digital_clone_profiles
service_lines
buyer_segments
offers
brand_rules
content_examples
knowledge_sources
galaxyai_runs
tool_runs
activity_log
```

Existing users are backfilled with a default workspace and owner membership.

### UI

Adds:

```text
/accounts
```

The Accounts page lets a VIP owner/admin:

- Create separate client/brand accounts.
- Record an account owner name/email.
- Add members/seats to an account.
- View active and pending memberships.

### API

Adds:

```text
GET /api/accounts
POST /api/accounts
POST /api/accounts/[accountId]/members
```

If `SUPABASE_SERVICE_ROLE_KEY` is configured, VIP attempts to send a Supabase invite. If not, it records a pending membership and shows a message.

## Important environment variable

For invite emails to work, Vercel needs:

```text
SUPABASE_SERVICE_ROLE_KEY=<your Supabase service role key>
```

Without it, accounts and pending memberships still work, but Supabase invite emails will not be sent.

## Apply instructions

1. Copy the files into the VIP repo.
2. Run the migration in Supabase:

```text
db/migrations/20260603_phase3b_multi_account_workspaces.sql
```

3. Commit and push.
4. Let Vercel rebuild.
5. Open:

```text
/accounts
```

## Suggested commit message

```text
Add Phase 3B multi-account workspace foundation
```

## What this intentionally does not do yet

This patch does not yet fully refactor every content screen to switch/filter by `account_id`.

That should be the next Phase 3B/3C step after the account foundation builds cleanly:

```text
Account switcher → current account context → campaign/assets filtered by account_id
```
