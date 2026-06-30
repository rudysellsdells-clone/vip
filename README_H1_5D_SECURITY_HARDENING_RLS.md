# H1.5D — Security Hardening / Supabase RLS Lockdown

This patch addresses Supabase's `rls_disabled_in_public` warning.

## Why this matters

Supabase warned that at least one `public` table can be read/edited/deleted without Row-Level Security. Marketing VIP is now a multi-client workspace app, so every public table needs RLS enabled.

## What the migration does

- Enables RLS on VIP-owned public tables.
- Revokes broad anonymous table/sequence access from `anon`.
- Keeps authenticated app access available through RLS policies.
- Recreates/refreshes the shared account access helper functions:
  - `public.user_is_platform_master()`
  - `public.user_can_view_account(uuid)`
  - `public.user_can_manage_account(uuid)`
- Adds safe policies for:
  - `profiles`
  - `accounts`
  - `account_memberships`
  - all other user-owned/account-owned/asset-linked public tables.
- Preserves legacy `user_id` rows while also supporting account-scoped rows.
- Does **not** force RLS, so service-role server/admin operations still work.
- Does **not** change Supabase Storage public image access.

## Required SQL

Run:

`db/migrations/20260630_h1_5d_security_hardening_rls.sql`

## After running the SQL

Run this verification query in Supabase SQL Editor:

```sql
select schemaname, tablename
from pg_tables
where schemaname = 'public'
  and rowsecurity = false
  and tablename not in (
    'spatial_ref_sys',
    'geography_columns',
    'geometry_columns',
    'raster_columns',
    'raster_overviews'
  )
order by tablename;
```

Expected result: **zero rows**.

## Test checklist

After deploy/migration, test:

1. MASTER can log in and open Dashboard.
2. MASTER can switch workspaces.
3. Client user can log in.
4. Client user only sees their workspace records.
5. Brand Voice loads and saves.
6. Monthly campaign creation still loads.
7. Approved asset page still loads.
8. Visual image generation still works.
9. Publish Center still loads.

## SQL only

This patch does not change app UI or business logic. It is a database security hardening patch.
