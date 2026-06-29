-- H1.4E2 Final Audit + Cleanup Account Scope
-- SAFE REPAIR VERSION
--
-- This version is intentionally idempotent and avoids assuming optional legacy
-- columns such as tool_runs.source_asset_id exist in every installed database.

alter table if exists public.asset_exports
  add column if not exists account_id uuid references public.accounts(id) on delete set null;

alter table if exists public.prospect_asset_links
  add column if not exists account_id uuid references public.accounts(id) on delete set null;

alter table if exists public.publishing_execution_runs
  add column if not exists account_id uuid references public.accounts(id) on delete set null;

alter table if exists public.zapier_action_policies
  add column if not exists account_id uuid references public.accounts(id) on delete set null;

create index if not exists idx_asset_exports_account_id on public.asset_exports(account_id);
create index if not exists idx_prospect_asset_links_account_id on public.prospect_asset_links(account_id);
create index if not exists idx_publishing_execution_runs_account_id on public.publishing_execution_runs(account_id);
create index if not exists idx_zapier_action_policies_account_id on public.zapier_action_policies(account_id);

-- Backfill account_id from related records where those columns exist.
do $$
begin
  if to_regclass('public.asset_exports') is not null
     and to_regclass('public.generated_assets') is not null
     and exists (
       select 1 from information_schema.columns
       where table_schema = 'public' and table_name = 'generated_assets' and column_name = 'account_id'
     ) then
    update public.asset_exports export
    set account_id = asset.account_id
    from public.generated_assets asset
    where export.account_id is null
      and export.asset_id = asset.id
      and asset.account_id is not null;
  end if;

  if to_regclass('public.prospect_asset_links') is not null
     and to_regclass('public.prospects') is not null
     and exists (
       select 1 from information_schema.columns
       where table_schema = 'public' and table_name = 'prospects' and column_name = 'account_id'
     ) then
    update public.prospect_asset_links link
    set account_id = prospect.account_id
    from public.prospects prospect
    where link.account_id is null
      and link.prospect_id = prospect.id
      and prospect.account_id is not null;
  end if;

  if to_regclass('public.prospect_asset_links') is not null
     and to_regclass('public.generated_assets') is not null
     and exists (
       select 1 from information_schema.columns
       where table_schema = 'public' and table_name = 'generated_assets' and column_name = 'account_id'
     ) then
    update public.prospect_asset_links link
    set account_id = asset.account_id
    from public.generated_assets asset
    where link.account_id is null
      and link.asset_id = asset.id
      and asset.account_id is not null;
  end if;

  if to_regclass('public.publishing_execution_runs') is not null
     and to_regclass('public.generated_assets') is not null
     and exists (
       select 1 from information_schema.columns
       where table_schema = 'public' and table_name = 'generated_assets' and column_name = 'account_id'
     ) then
    update public.publishing_execution_runs run
    set account_id = asset.account_id
    from public.generated_assets asset
    where run.account_id is null
      and run.asset_id = asset.id
      and asset.account_id is not null;
  end if;

  -- Optional legacy tool_runs backfill.
  -- Some installs never had tool_runs.source_asset_id, so this block only runs
  -- when the column exists. This avoids the failed migration error:
  -- "column run.source_asset_id does not exist".
  if to_regclass('public.tool_runs') is not null
     and to_regclass('public.generated_assets') is not null
     and exists (
       select 1 from information_schema.columns
       where table_schema = 'public' and table_name = 'tool_runs' and column_name = 'account_id'
     )
     and exists (
       select 1 from information_schema.columns
       where table_schema = 'public' and table_name = 'tool_runs' and column_name = 'source_asset_id'
     )
     and exists (
       select 1 from information_schema.columns
       where table_schema = 'public' and table_name = 'generated_assets' and column_name = 'account_id'
     ) then
    update public.tool_runs run
    set account_id = asset.account_id
    from public.generated_assets asset
    where run.account_id is null
      and run.source_asset_id = asset.id
      and asset.account_id is not null;
  end if;

  -- Optional tool_runs JSON-input backfill for installs where the source asset
  -- was stored in input JSON instead of a real source_asset_id column.
  if to_regclass('public.tool_runs') is not null
     and to_regclass('public.generated_assets') is not null
     and exists (
       select 1 from information_schema.columns
       where table_schema = 'public' and table_name = 'tool_runs' and column_name = 'account_id'
     )
     and exists (
       select 1 from information_schema.columns
       where table_schema = 'public' and table_name = 'tool_runs' and column_name = 'input'
     )
     and exists (
       select 1 from information_schema.columns
       where table_schema = 'public' and table_name = 'generated_assets' and column_name = 'account_id'
     ) then
    update public.tool_runs run
    set account_id = asset.account_id
    from public.generated_assets asset
    where run.account_id is null
      and asset.account_id is not null
      and coalesce(run.input->>'source_asset_id', run.input->>'assetId', run.input->>'asset_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      and coalesce(run.input->>'source_asset_id', run.input->>'assetId', run.input->>'asset_id')::uuid = asset.id;
  end if;

  -- Best-effort legacy Zapier policy backfill. New routes write account_id directly.
  if to_regclass('public.zapier_action_policies') is not null
     and to_regclass('public.profiles') is not null
     and exists (
       select 1 from information_schema.columns
       where table_schema = 'public' and table_name = 'profiles' and column_name = 'last_active_account_id'
     )
     and exists (
       select 1 from information_schema.columns
       where table_schema = 'public' and table_name = 'profiles' and column_name = 'default_account_id'
     ) then
    update public.zapier_action_policies policy
    set account_id = coalesce(profile.last_active_account_id, profile.default_account_id)
    from public.profiles profile
    where policy.account_id is null
      and policy.user_id = profile.id
      and coalesce(profile.last_active_account_id, profile.default_account_id) is not null;
  end if;
end $$;

-- Account-aware RLS for export/link/audit support tables.
do $$
declare
  scoped_table text;
begin
  foreach scoped_table in array array[
    'asset_exports',
    'prospect_asset_links',
    'publishing_execution_runs',
    'zapier_action_policies'
  ] loop
    if to_regclass('public.' || quote_ident(scoped_table)) is not null then
      execute format('alter table public.%I enable row level security', scoped_table);

      execute format('drop policy if exists %I on public.%I', 'Users can view their own ' || scoped_table, scoped_table);
      execute format('drop policy if exists %I on public.%I', 'Users can insert their own ' || scoped_table, scoped_table);
      execute format('drop policy if exists %I on public.%I', 'Users can update their own ' || scoped_table, scoped_table);
      execute format('drop policy if exists %I on public.%I', 'Users can delete their own ' || scoped_table, scoped_table);

      execute format('drop policy if exists %I on public.%I', 'Account members can view account ' || scoped_table, scoped_table);
      execute format(
        'create policy %I on public.%I for select to authenticated using ((account_id is not null and public.user_can_view_account(account_id)) or (account_id is null and user_id = auth.uid()))',
        'Account members can view account ' || scoped_table,
        scoped_table
      );

      execute format('drop policy if exists %I on public.%I', 'Account managers can insert account ' || scoped_table, scoped_table);
      execute format(
        'create policy %I on public.%I for insert to authenticated with check ((account_id is not null and public.user_can_manage_account(account_id)) or (account_id is null and user_id = auth.uid()))',
        'Account managers can insert account ' || scoped_table,
        scoped_table
      );

      execute format('drop policy if exists %I on public.%I', 'Account managers can update account ' || scoped_table, scoped_table);
      execute format(
        'create policy %I on public.%I for update to authenticated using ((account_id is not null and public.user_can_manage_account(account_id)) or (account_id is null and user_id = auth.uid())) with check ((account_id is not null and public.user_can_manage_account(account_id)) or (account_id is null and user_id = auth.uid()))',
        'Account managers can update account ' || scoped_table,
        scoped_table
      );

      execute format('drop policy if exists %I on public.%I', 'Account managers can delete account ' || scoped_table, scoped_table);
      execute format(
        'create policy %I on public.%I for delete to authenticated using ((account_id is not null and public.user_can_manage_account(account_id)) or (account_id is null and user_id = auth.uid()))',
        'Account managers can delete account ' || scoped_table,
        scoped_table
      );
    end if;
  end loop;
end $$;

notify pgrst, 'reload schema';
