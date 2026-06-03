# VIP Phase 3D Remove Account Seat Users Patch

## What this adds

Adds the ability to remove seat users/members from an account.

This is a safe access removal, not a hard user delete.

## Files included

```text
src/app/api/accounts/[accountId]/members/route.ts
src/app/(app)/accounts/[accountId]/page.tsx
src/components/accounts/RemoveAccountMemberButton.tsx
```

## Behavior

On the account detail page:

```text
/accounts/[accountId]
```

The members table now includes a `Remove` button for each removable member.

When clicked, VIP:

1. Confirms the removal.
2. Checks that the current user can manage the account.
3. Uses the server-side Supabase service-role client.
4. Updates the membership row:

```text
status = removed
removed_at = current timestamp
```

The user/auth record is not deleted.

## Safety rules

VIP will not remove:

```text
The currently signed-in user's own access
The primary account owner from this screen
```

Owner-level memberships can only be removed by a platform owner/admin.

## No SQL migration required

This uses the existing `account_memberships.status` and `removed_at` fields from Phase 3B.

## Suggested commit message

```text
Add remove seat user action for account members
```
