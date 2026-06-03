-- Phase 3B account creation RLS policy fix
-- Purpose:
-- Allow VIP platform owners/admins to create managed client accounts and memberships
-- even when the API route uses the signed-in Supabase client.

-- This assumes the Phase 3B migration has already added:
-- public.profiles.platform_role
-- public.accounts
-- public.account_memberships

-- Accounts: platform owners/admins may create accounts they own.
drop policy if exists "VIP platform owners can create accounts" on public.accounts;

create policy "VIP platform owners can create accounts"
on public.accounts
for insert
to authenticated
with check (
  owner_user_id = auth.uid()
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and coalesce(p.platform_role, '') in ('owner', 'admin')
  )
);

-- Account memberships: platform owners/admins may create memberships they invite.
drop policy if exists "VIP platform owners can create account memberships" on public.account_memberships;

create policy "VIP platform owners can create account memberships"
on public.account_memberships
for insert
to authenticated
with check (
  invited_by_user_id = auth.uid()
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and coalesce(p.platform_role, '') in ('owner', 'admin')
  )
);

-- Account owners/admins may add members to accounts they manage.
drop policy if exists "Account owners and admins can create memberships" on public.account_memberships;

create policy "Account owners and admins can create memberships"
on public.account_memberships
for insert
to authenticated
with check (
  invited_by_user_id = auth.uid()
  and (
    exists (
      select 1
      from public.accounts a
      where a.id = account_id
        and a.owner_user_id = auth.uid()
    )
    or exists (
      select 1
      from public.account_memberships am
      where am.account_id = account_memberships.account_id
        and am.user_id = auth.uid()
        and am.role in ('owner', 'admin')
        and am.status = 'active'
        and am.removed_at is null
    )
  )
);

-- Optional sanity check query:
-- After running, this should return your current profile role if you are signed in through the app.
-- select id, email, platform_role from public.profiles where id = auth.uid();
