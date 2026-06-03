# VIP Phase 3B Account Creation RLS Fix

## What this fixes

VIP showed this error when creating a new account/workspace:

```text
new row violates row-level security policy for table "accounts"
```

The user permission check was working, but the actual insert into `accounts` was being attempted with the normal signed-in Supabase client. Because `accounts` is now RLS-protected, that insert can be blocked depending on the session/JWT context.

## File replacements

```text
src/app/api/accounts/route.ts
src/app/api/accounts/[accountId]/members/route.ts
```

## What changed

- The route still verifies the signed-in user first.
- The route still checks that the signed-in profile is a VIP `owner` or `admin` before creating a new managed account.
- The actual `accounts` and `account_memberships` inserts now use the server-side Supabase service-role client.
- The member invite route now explicitly verifies that the signed-in user can manage the account before using the service-role client to insert a member.

This keeps RLS protection in place for normal user reads while allowing trusted server routes to create managed client accounts.

## Required Vercel environment variable

This patch requires:

```text
SUPABASE_SERVICE_ROLE_KEY
```

Your app already had optional invite behavior based on this key, but account creation now also needs it so the server route can create accounts safely.

## After applying

1. Replace the two files above.
2. Confirm `SUPABASE_SERVICE_ROLE_KEY` is set in Vercel.
3. Redeploy.
4. Try creating a new account again from `/accounts`.
