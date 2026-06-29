-- H1.4E2 Final Audit + Cleanup Account Scope
-- Adds workspace/account identifiers to remaining audit/export/link tables and
-- updates RLS so account members see only records for accounts they can access.

alter table public.asset_exports add column if not exists account_id uuid references public.accounts(id) on delete set null;
alter table public.prospect_asset_links add column if not exists account_id uuid references public.accounts(id) on delete set null;
alter table public.publishing_execution_runs add column if not exists account_id uuid references public.accounts(id) on delete set null;
alter table public.zapier_action_policies add column if not exists account_id uuid references public.accounts(id) on delete set null;

create index if not exists idx_asset_exports_account_id on public.asset_exports(account_id);
create index if not exists idx_prospect_asset_links_account_id on public.prospect_asset_links(account_id);
create index if not exists idx_publishing_execution_runs_account_id on public.publishing_execution_runs(account_id);
create index if not exists idx_zapier_action_policies_account_id on public.zapier_action_policies(account_id);

-- Backfill account_id from the records that already carry account ownership.
update public.asset_exports export
set account_id = asset.account_id
from public.generated_assets asset
where export.account_id is null
  and export.asset_id = asset.id
  and asset.account_id is not null;

update public.prospect_asset_links link
set account_id = prospect.account_id
from public.prospects prospect
where link.account_id is null
  and link.prospect_id = prospect.id
  and prospect.account_id is not null;

update public.prospect_asset_links link
set account_id = asset.account_id
from public.generated_assets asset
where link.account_id is null
  and link.asset_id = asset.id
  and asset.account_id is not null;

update public.publishing_execution_runs run
set account_id = asset.account_id
from public.generated_assets asset
where run.account_id is null
  and run.asset_id = asset.id
  and asset.account_id is not null;

update public.tool_runs run
set account_id = asset.account_id
from public.generated_assets asset
where run.account_id is null
  and run.source_asset_id = asset.id
  and asset.account_id is not null;

-- Best-effort legacy policy backfill. New policies/routes will write account_id directly.
update public.zapier_action_policies policy
set account_id = coalesce(profile.last_active_account_id, profile.default_account_id)
from public.profiles profile
where policy.account_id is null
  and policy.user_id = profile.id
  and coalesce(profile.last_active_account_id, profile.default_account_id) is not null;

-- Account-aware RLS for export/link/audit support tables.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'asset_exports',
    'prospect_asset_links',
    'publishing_execution_runs',
    'zapier_action_policies'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);

    execute format('drop policy if exists %I on public.%I', 'Users can view their own ' || table_name, table_name);
    execute format('drop policy if exists %I on public.%I', 'Users can insert their own ' || table_name, table_name);
    execute format('drop policy if exists %I on public.%I', 'Users can update their own ' || table_name, table_name);
    execute format('drop policy if exists %I on public.%I', 'Users can delete their own ' || table_name, table_name);

    execute format('drop policy if exists %I on public.%I', 'Account members can view account ' || table_name, table_name);
    execute format(
      'create policy %I on public.%I for select to authenticated using ((account_id is not null and public.user_can_view_account(account_id)) or (account_id is null and user_id = auth.uid()))',
      'Account members can view account ' || table_name,
      table_name
    );

    execute format('drop policy if exists %I on public.%I', 'Account managers can insert account ' || table_name, table_name);
    execute format(
      'create policy %I on public.%I for insert to authenticated with check ((account_id is not null and public.user_can_manage_account(account_id)) or (account_id is null and user_id = auth.uid()))',
      'Account managers can insert account ' || table_name,
      table_name
    );

    execute format('drop policy if exists %I on public.%I', 'Account managers can update account ' || table_name, table_name);
    execute format(
      'create policy %I on public.%I for update to authenticated using ((account_id is not null and public.user_can_manage_account(account_id)) or (account_id is null and user_id = auth.uid())) with check ((account_id is not null and public.user_can_manage_account(account_id)) or (account_id is null and user_id = auth.uid()))',
      'Account managers can update account ' || table_name,
      table_name
    );

    execute format('drop policy if exists %I on public.%I', 'Account managers can delete account ' || table_name, table_name);
    execute format(
      'create policy %I on public.%I for delete to authenticated using ((account_id is not null and public.user_can_manage_account(account_id)) or (account_id is null and user_id = auth.uid()))',
      'Account managers can delete account ' || table_name,
      table_name
    );
  end loop;
end $$;

notify pgrst, 'reload schema';
