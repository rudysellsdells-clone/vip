-- H1.5D Security Hardening — Supabase public table RLS lock-down
--
-- Purpose:
-- Supabase warned that at least one public table has Row-Level Security disabled
-- ("rls_disabled_in_public"). Marketing VIP is now a multi-client app, so this
-- migration enables RLS across public tables and adds safe user/account policies.
--
-- Safe to run more than once.
-- This does NOT force RLS, so service-role/admin server code can continue to run.
-- This does NOT change storage bucket access for generated images.

create or replace function public.user_is_platform_master()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and coalesce(lower(p.platform_role), '') in (
        'master',
        'owner',
        'admin',
        'platform_owner',
        'platform_admin'
      )
  );
$$;

create or replace function public.user_can_view_account(target_account_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.user_is_platform_master()
    or exists (
      select 1
      from public.accounts a
      where a.id = target_account_id
        and coalesce(a.status, 'active') <> 'archived'
        and (
          a.owner_user_id = auth.uid()
          or exists (
            select 1
            from public.account_memberships m
            where m.account_id = a.id
              and m.user_id = auth.uid()
              and m.status = 'active'
              and m.removed_at is null
          )
        )
    );
$$;

create or replace function public.user_can_manage_account(target_account_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.user_is_platform_master()
    or exists (
      select 1
      from public.accounts a
      where a.id = target_account_id
        and coalesce(a.status, 'active') <> 'archived'
        and (
          a.owner_user_id = auth.uid()
          or exists (
            select 1
            from public.account_memberships m
            where m.account_id = a.id
              and m.user_id = auth.uid()
              and m.role in ('owner', 'admin', 'editor')
              and m.status = 'active'
              and m.removed_at is null
          )
        )
    );
$$;

grant execute on function public.user_is_platform_master() to authenticated;
grant execute on function public.user_can_view_account(uuid) to authenticated;
grant execute on function public.user_can_manage_account(uuid) to authenticated;

-- Remove broad anonymous table access. Authenticated app users still use
-- table grants plus RLS policies below.
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;

-- Future public tables should not accidentally become anonymously accessible.
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke all on sequences from anon;
alter default privileges in schema public grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public grant usage, select on sequences to authenticated;

-- Enable RLS on every normal public table we own. Exclude common extension tables.
do $$
declare
  r record;
begin
  for r in
    select c.relname as table_name
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind in ('r', 'p')
      and c.relname not in (
        'spatial_ref_sys',
        'geography_columns',
        'geometry_columns',
        'raster_columns',
        'raster_overviews'
      )
  loop
    execute format('alter table public.%I enable row level security', r.table_name);
  end loop;
end $$;

-- Profiles are personal records. Users can see/update themselves; platform
-- masters can support/repair records.
do $$
begin
  if to_regclass('public.profiles') is not null then
    drop policy if exists "h15d_profiles_select" on public.profiles;
    create policy "h15d_profiles_select"
    on public.profiles
    for select
    to authenticated
    using (
      id = auth.uid()
      or public.user_is_platform_master()
    );

    drop policy if exists "h15d_profiles_insert" on public.profiles;
    create policy "h15d_profiles_insert"
    on public.profiles
    for insert
    to authenticated
    with check (
      id = auth.uid()
      or public.user_is_platform_master()
    );

    drop policy if exists "h15d_profiles_update" on public.profiles;
    create policy "h15d_profiles_update"
    on public.profiles
    for update
    to authenticated
    using (
      id = auth.uid()
      or public.user_is_platform_master()
    )
    with check (
      id = auth.uid()
      or public.user_is_platform_master()
    );
  end if;
end $$;

-- Accounts are visible/manageable only to account members or platform masters.
do $$
begin
  if to_regclass('public.accounts') is not null then
    drop policy if exists "h15d_accounts_select" on public.accounts;
    create policy "h15d_accounts_select"
    on public.accounts
    for select
    to authenticated
    using (
      public.user_can_view_account(id)
    );

    drop policy if exists "h15d_accounts_insert" on public.accounts;
    create policy "h15d_accounts_insert"
    on public.accounts
    for insert
    to authenticated
    with check (
      owner_user_id = auth.uid()
      or public.user_is_platform_master()
    );

    drop policy if exists "h15d_accounts_update" on public.accounts;
    create policy "h15d_accounts_update"
    on public.accounts
    for update
    to authenticated
    using (
      public.user_can_manage_account(id)
    )
    with check (
      public.user_can_manage_account(id)
    );

    drop policy if exists "h15d_accounts_delete" on public.accounts;
    create policy "h15d_accounts_delete"
    on public.accounts
    for delete
    to authenticated
    using (
      public.user_can_manage_account(id)
    );
  end if;
end $$;

-- Memberships can be viewed by account members. Only account managers/platform
-- masters can create/update/delete membership rows.
do $$
begin
  if to_regclass('public.account_memberships') is not null then
    drop policy if exists "h15d_memberships_select" on public.account_memberships;
    create policy "h15d_memberships_select"
    on public.account_memberships
    for select
    to authenticated
    using (
      public.user_can_view_account(account_id)
      or user_id = auth.uid()
      or lower(email) = lower(coalesce(auth.email(), ''))
      or public.user_is_platform_master()
    );

    drop policy if exists "h15d_memberships_insert" on public.account_memberships;
    create policy "h15d_memberships_insert"
    on public.account_memberships
    for insert
    to authenticated
    with check (
      public.user_can_manage_account(account_id)
      or public.user_is_platform_master()
    );

    drop policy if exists "h15d_memberships_update" on public.account_memberships;
    create policy "h15d_memberships_update"
    on public.account_memberships
    for update
    to authenticated
    using (
      public.user_can_manage_account(account_id)
      or public.user_is_platform_master()
    )
    with check (
      public.user_can_manage_account(account_id)
      or public.user_is_platform_master()
    );

    drop policy if exists "h15d_memberships_delete" on public.account_memberships;
    create policy "h15d_memberships_delete"
    on public.account_memberships
    for delete
    to authenticated
    using (
      public.user_can_manage_account(account_id)
      or public.user_is_platform_master()
    );
  end if;
end $$;

-- Generic account/user/asset scoped policies for the rest of VIP's public tables.
-- This block inspects each table and creates the least-broad usable rule based on
-- the columns present:
-- - account_id => current user can view/manage that account
-- - user_id    => current user owns the row, preserving legacy rows
-- - asset_id   => row inherits access from linked generated_assets.account_id
-- - otherwise  => platform masters only
do $$
declare
  r record;
  has_user_id boolean;
  has_account_id boolean;
  has_asset_id boolean;
  select_expr text;
  manage_expr text;
  legacy_user_expr text;
  account_view_expr text;
  account_manage_expr text;
  asset_view_expr text;
  asset_manage_expr text;
begin
  for r in
    select c.relname as table_name
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind in ('r', 'p')
      and c.relname not in (
        'profiles',
        'accounts',
        'account_memberships',
        'spatial_ref_sys',
        'geography_columns',
        'geometry_columns',
        'raster_columns',
        'raster_overviews'
      )
  loop
    select exists (
      select 1 from information_schema.columns
      where table_schema = 'public'
        and table_name = r.table_name
        and column_name = 'user_id'
    ) into has_user_id;

    select exists (
      select 1 from information_schema.columns
      where table_schema = 'public'
        and table_name = r.table_name
        and column_name = 'account_id'
    ) into has_account_id;

    select exists (
      select 1 from information_schema.columns
      where table_schema = 'public'
        and table_name = r.table_name
        and column_name = 'asset_id'
    ) into has_asset_id;

    legacy_user_expr := case
      when has_user_id then format('%I.user_id = auth.uid()', r.table_name)
      else 'false'
    end;

    account_view_expr := case
      when has_account_id then format('(%I.account_id is not null and public.user_can_view_account(%I.account_id))', r.table_name, r.table_name)
      else 'false'
    end;

    account_manage_expr := case
      when has_account_id then format('(%I.account_id is not null and public.user_can_manage_account(%I.account_id))', r.table_name, r.table_name)
      else 'false'
    end;

    asset_view_expr := case
      when has_asset_id and to_regclass('public.generated_assets') is not null then format(
        'exists (select 1 from public.generated_assets ga where ga.id = %I.asset_id and ga.account_id is not null and public.user_can_view_account(ga.account_id))',
        r.table_name
      )
      else 'false'
    end;

    asset_manage_expr := case
      when has_asset_id and to_regclass('public.generated_assets') is not null then format(
        'exists (select 1 from public.generated_assets ga where ga.id = %I.asset_id and ga.account_id is not null and public.user_can_manage_account(ga.account_id))',
        r.table_name
      )
      else 'false'
    end;

    select_expr := format(
      'public.user_is_platform_master() or %s or %s or %s',
      account_view_expr,
      asset_view_expr,
      legacy_user_expr
    );

    manage_expr := format(
      'public.user_is_platform_master() or %s or %s or %s',
      account_manage_expr,
      asset_manage_expr,
      legacy_user_expr
    );

    execute format('alter table public.%I enable row level security', r.table_name);

    execute format('drop policy if exists "h15d_select" on public.%I', r.table_name);
    execute format(
      'create policy "h15d_select" on public.%I for select to authenticated using (%s)',
      r.table_name,
      select_expr
    );

    execute format('drop policy if exists "h15d_insert" on public.%I', r.table_name);
    execute format(
      'create policy "h15d_insert" on public.%I for insert to authenticated with check (%s)',
      r.table_name,
      manage_expr
    );

    execute format('drop policy if exists "h15d_update" on public.%I', r.table_name);
    execute format(
      'create policy "h15d_update" on public.%I for update to authenticated using (%s) with check (%s)',
      r.table_name,
      manage_expr,
      manage_expr
    );

    execute format('drop policy if exists "h15d_delete" on public.%I', r.table_name);
    execute format(
      'create policy "h15d_delete" on public.%I for delete to authenticated using (%s)',
      r.table_name,
      manage_expr
    );
  end loop;
end $$;

notify pgrst, 'reload schema';

-- Verification query to run after this migration:
-- It should return zero rows for VIP-owned public tables.
--
-- select schemaname, tablename
-- from pg_tables
-- where schemaname = 'public'
--   and rowsecurity = false
--   and tablename not in (
--     'spatial_ref_sys',
--     'geography_columns',
--     'geometry_columns',
--     'raster_columns',
--     'raster_overviews'
--   )
-- order by tablename;
