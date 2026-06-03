# VIP Phase 3B Account Create RLS Policy Fix

## What this fixes

VIP shows:

```text
new row violates row-level security policy for table "accounts"
```

If `SUPABASE_SERVICE_ROLE_KEY` is already set, this usually means the deployed route is still inserting through the normal signed-in client, or the current RLS policies do not allow platform owners/admins to create account rows.

This SQL adds explicit RLS insert policies so platform owners/admins can create managed accounts and account memberships.

## File included

```text
db/migrations/20260603_phase3b_account_create_rls_policy_fix.sql
```

## Run this in Supabase

Open the SQL file, copy the full contents, and run it in Supabase SQL Editor.

## What it allows

A signed-in user can insert into `accounts` when:

```text
profiles.platform_role is owner or admin
and accounts.owner_user_id = auth.uid()
```

A signed-in user can insert into `account_memberships` when:

```text
profiles.platform_role is owner or admin
and invited_by_user_id = auth.uid()
```

It also allows existing account owners/admins to add members to accounts they manage.

## After running

Try creating the account again in VIP.

If it still fails, check that your current profile has:

```text
platform_role = owner
```

in the `profiles` table.
