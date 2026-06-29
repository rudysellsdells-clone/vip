-- H1.4E2 Final Audit + Cleanup Account Scope
-- SAFE REPAIR V3
--
-- This version is intentionally idempotent and avoids static SQL references to
-- optional legacy columns. Optional backfills only run through dynamic SQL after
-- the migration confirms the relevant table and columns exist.

-- Add account_id to support/audit tables when those tables exist.
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
      execute format(
        'alter table public.%I add column if not exists account_id uuid references public.accounts(id) on delete set null',
        scoped_table
      );

      execute format(
        'create index if not exists %I on public.%I(account_id)',
        'idx_' || scoped_table || '_account_id',
        scoped_table
      );
    end if;
  end loop;
end $$;

-- Backfill account_id from related records where those relationships exist.
do $$
begin
  if to_regclass('public.asset_exports') is not null
     and to_regclass('public.generated_assets') is not null
     and exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'asset_exports' and column_name = 'account_id')
     and exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'asset_exports' and column_name = 'asset_id')
     and exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'generated_assets' and column_name = 'account_id') then
    execute $sql$
      update public.asset_exports export
      set account_id = asset.account_id
      from public.generated_assets asset
      where export.account_id is null
        and export.asset_id = asset.id
        and asset.account_id is not null
    $sql$;
  end if;

  if to_regclass('public.prospect_asset_links') is not null
     and to_regclass('public.prospects') is not null
     and exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'prospect_asset_links' and column_name = 'account_id')
     and exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'prospect_asset_links' and column_name = 'prospect_id')
     and exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'prospects' and column_name = 'account_id') then
    execute $sql$
      update public.prospect_asset_links link
      set account_id = prospect.account_id
      from public.prospects prospect
      where link.account_id is null
        and link.prospect_id = prospect.id
        and prospect.account_id is not null
    $sql$;
  end if;

  if to_regclass('public.prospect_asset_links') is not null
     and to_regclass('public.generated_assets') is not null
     and exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'prospect_asset_links' and column_name = 'account_id')
     and exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'prospect_asset_links' and column_name = 'asset_id')
     and exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'generated_assets' and column_name = 'account_id') then
    execute $sql$
      update public.prospect_asset_links link
      set account_id = asset.account_id
      from public.generated_assets asset
      where link.account_id is null
        and link.asset_id = asset.id
        and asset.account_id is not null
    $sql$;
  end if;

  if to_regclass('public.publishing_execution_runs') is not null
     and to_regclass('public.generated_assets') is not null
     and exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'publishing_execution_runs' and column_name = 'account_id')
     and exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'publishing_execution_runs' and column_name = 'asset_id')
     and exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'generated_assets' and column_name = 'account_id') then
    execute $sql$
      update public.publishing_execution_runs exec_run
      set account_id = asset.account_id
      from public.generated_assets asset
      where exec_run.account_id is null
        and exec_run.asset_id = asset.id
        and asset.account_id is not null
    $sql$;
  end if;

  -- Optional tool_runs JSON-input backfill. This only uses input JSON keys and
  -- does not assume any legacy asset-reference column exists on tool_runs.
  if to_regclass('public.tool_runs') is not null
     and to_regclass('public.generated_assets') is not null
     and exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'tool_runs' and column_name = 'account_id')
     and exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'tool_runs' and column_name = 'input')
     and exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'generated_assets' and column_name = 'account_id') then
    execute $sql$
      update public.tool_runs tool_run
      set account_id = asset.account_id
      from public.generated_assets asset
      where tool_run.account_id is null
        and asset.account_id is not null
        and coalesce(tool_run.input->>'assetId', tool_run.input->>'asset_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        and coalesce(tool_run.input->>'assetId', tool_run.input->>'asset_id')::uuid = asset.id
    $sql$;
  end if;

  -- Best-effort legacy Zapier policy backfill. New routes write account_id directly.
  if to_regclass('public.zapier_action_policies') is not null
     and to_regclass('public.profiles') is not null
     and exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'zapier_action_policies' and column_name = 'account_id')
     and exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'zapier_action_policies' and column_name = 'user_id')
     and exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'last_active_account_id')
     and exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'default_account_id') then
    execute $sql$
      update public.zapier_action_policies policy
      set account_id = coalesce(profile.last_active_account_id, profile.default_account_id)
      from public.profiles profile
      where policy.account_id is null
        and policy.user_id = profile.id
        and coalesce(profile.last_active_account_id, profile.default_account_id) is not null
    $sql$;
  end if;
end $$;

-- Account-aware RLS for export/link/audit support tables.
do $$
declare
  scoped_table text;
  has_user_id boolean;
  select_policy text;
  insert_policy text;
  update_policy text;
  delete_policy text;
begin
  foreach scoped_table in array array[
    'asset_exports',
    'prospect_asset_links',
    'publishing_execution_runs',
    'zapier_action_policies'
  ] loop
    if to_regclass('public.' || quote_ident(scoped_table)) is not null
       and exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = scoped_table and column_name = 'account_id') then
      execute format('alter table public.%I enable row level security', scoped_table);

      select exists (
        select 1 from information_schema.columns
        where table_schema = 'public' and table_name = scoped_table and column_name = 'user_id'
      ) into has_user_id;

      if has_user_id then
        select_policy := '(account_id is not null and public.user_can_view_account(account_id)) or (account_id is null and user_id = auth.uid())';
        insert_policy := '(account_id is not null and public.user_can_manage_account(account_id)) or (account_id is null and user_id = auth.uid())';
        update_policy := insert_policy;
        delete_policy := insert_policy;
      else
        select_policy := 'account_id is not null and public.user_can_view_account(account_id)';
        insert_policy := 'account_id is not null and public.user_can_manage_account(account_id)';
        update_policy := insert_policy;
        delete_policy := insert_policy;
      end if;

      execute format('drop policy if exists %I on public.%I', 'Users can view their own ' || scoped_table, scoped_table);
      execute format('drop policy if exists %I on public.%I', 'Users can insert their own ' || scoped_table, scoped_table);
      execute format('drop policy if exists %I on public.%I', 'Users can update their own ' || scoped_table, scoped_table);
      execute format('drop policy if exists %I on public.%I', 'Users can delete their own ' || scoped_table, scoped_table);

      execute format('drop policy if exists %I on public.%I', 'Account members can view account ' || scoped_table, scoped_table);
      execute format(
        'create policy %I on public.%I for select to authenticated using (%s)',
        'Account members can view account ' || scoped_table,
        scoped_table,
        select_policy
      );

      execute format('drop policy if exists %I on public.%I', 'Account managers can insert account ' || scoped_table, scoped_table);
      execute format(
        'create policy %I on public.%I for insert to authenticated with check (%s)',
        'Account managers can insert account ' || scoped_table,
        scoped_table,
        insert_policy
      );

      execute format('drop policy if exists %I on public.%I', 'Account managers can update account ' || scoped_table, scoped_table);
      execute format(
        'create policy %I on public.%I for update to authenticated using (%s) with check (%s)',
        'Account managers can update account ' || scoped_table,
        scoped_table,
        update_policy,
        update_policy
      );

      execute format('drop policy if exists %I on public.%I', 'Account managers can delete account ' || scoped_table, scoped_table);
      execute format(
        'create policy %I on public.%I for delete to authenticated using (%s)',
        'Account managers can delete account ' || scoped_table,
        scoped_table,
        delete_policy
      );
    end if;
  end loop;
end $$;

notify pgrst, 'reload schema';
