-- H1.4E1: Business Modules Account Scope
-- Adds workspace/account scoping to remaining business modules:
-- prospects, opportunities, directory link builder tables, and GalaxyAI workflows.
-- This is additive; legacy user-owned policies remain as fallback for old rows.

create extension if not exists "pgcrypto";

-- Pipeline tables.
alter table public.prospects
  add column if not exists account_id uuid references public.accounts(id) on delete set null;

alter table public.opportunities
  add column if not exists account_id uuid references public.accounts(id) on delete set null;

create index if not exists idx_prospects_account_id on public.prospects(account_id);
create index if not exists idx_opportunities_account_id on public.opportunities(account_id);

-- Directory link builder tables.
alter table public.directory_profiles
  add column if not exists account_id uuid references public.accounts(id) on delete set null;

alter table public.directory_opportunities
  add column if not exists account_id uuid references public.accounts(id) on delete set null;

alter table public.directory_submissions
  add column if not exists account_id uuid references public.accounts(id) on delete set null;

alter table public.acquired_backlinks
  add column if not exists account_id uuid references public.accounts(id) on delete set null;

create index if not exists idx_directory_profiles_account_id on public.directory_profiles(account_id);
create index if not exists idx_directory_opportunities_account_id on public.directory_opportunities(account_id);
create index if not exists idx_directory_submissions_account_id on public.directory_submissions(account_id);
create index if not exists idx_acquired_backlinks_account_id on public.acquired_backlinks(account_id);

-- GalaxyAI workflows were still user-scoped even though runs are account-scoped.
alter table public.galaxyai_workflows
  add column if not exists account_id uuid references public.accounts(id) on delete set null;

create index if not exists idx_galaxyai_workflows_account_id on public.galaxyai_workflows(account_id);

-- The original private build treated workflow IDs as user-global. In a multi-workspace
-- MASTER account, the same GalaxyAI workflow must be reusable across accounts.
alter table public.galaxyai_workflows
  drop constraint if exists galaxyai_workflows_user_id_galaxy_workflow_id_key;

create index if not exists idx_galaxyai_workflows_user_workflow
  on public.galaxyai_workflows(user_id, galaxy_workflow_id);

create unique index if not exists galaxyai_workflows_account_workflow_unique
  on public.galaxyai_workflows(account_id, galaxy_workflow_id)
  where account_id is not null;

-- Backfill pipeline rows from linked rows first, then user-owned workspaces.
update public.prospects p
set account_id = a.id
from public.accounts a
where p.account_id is null
  and p.user_id = a.owner_user_id;

update public.opportunities o
set account_id = p.account_id
from public.prospects p
where o.account_id is null
  and o.prospect_id = p.id
  and p.account_id is not null;

update public.opportunities o
set account_id = a.id
from public.accounts a
where o.account_id is null
  and o.user_id = a.owner_user_id;

-- Backfill directory rows through their owner workspaces and linked rows.
update public.directory_profiles dp
set account_id = a.id
from public.accounts a
where dp.account_id is null
  and dp.user_id = a.owner_user_id;

update public.directory_opportunities dio
set account_id = a.id
from public.accounts a
where dio.account_id is null
  and dio.user_id = a.owner_user_id;

update public.directory_submissions ds
set account_id = dio.account_id
from public.directory_opportunities dio
where ds.account_id is null
  and ds.opportunity_id = dio.id
  and dio.account_id is not null;

update public.directory_submissions ds
set account_id = dp.account_id
from public.directory_profiles dp
where ds.account_id is null
  and ds.profile_id = dp.id
  and dp.account_id is not null;

update public.directory_submissions ds
set account_id = a.id
from public.accounts a
where ds.account_id is null
  and ds.user_id = a.owner_user_id;

update public.acquired_backlinks ab
set account_id = ds.account_id
from public.directory_submissions ds
where ab.account_id is null
  and ab.submission_id = ds.id
  and ds.account_id is not null;

update public.acquired_backlinks ab
set account_id = dio.account_id
from public.directory_opportunities dio
where ab.account_id is null
  and ab.opportunity_id = dio.id
  and dio.account_id is not null;

update public.acquired_backlinks ab
set account_id = a.id
from public.accounts a
where ab.account_id is null
  and ab.user_id = a.owner_user_id;

update public.galaxyai_workflows gw
set account_id = a.id
from public.accounts a
where gw.account_id is null
  and gw.user_id = a.owner_user_id;

-- Account-aware RLS policies. Existing user_id policies stay in place for old unassigned rows.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'prospects',
    'opportunities',
    'directory_profiles',
    'directory_opportunities',
    'directory_submissions',
    'acquired_backlinks',
    'galaxyai_workflows'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);

    execute format('drop policy if exists %I on public.%I', 'Account members can view account ' || table_name, table_name);
    execute format(
      'create policy %I on public.%I for select to authenticated using (account_id is not null and public.user_can_view_account(account_id))',
      'Account members can view account ' || table_name,
      table_name
    );

    execute format('drop policy if exists %I on public.%I', 'Account managers can insert account ' || table_name, table_name);
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (account_id is not null and public.user_can_manage_account(account_id))',
      'Account managers can insert account ' || table_name,
      table_name
    );

    execute format('drop policy if exists %I on public.%I', 'Account managers can update account ' || table_name, table_name);
    execute format(
      'create policy %I on public.%I for update to authenticated using (account_id is not null and public.user_can_manage_account(account_id)) with check (account_id is not null and public.user_can_manage_account(account_id))',
      'Account managers can update account ' || table_name,
      table_name
    );

    execute format('drop policy if exists %I on public.%I', 'Account managers can delete account ' || table_name, table_name);
    execute format(
      'create policy %I on public.%I for delete to authenticated using (account_id is not null and public.user_can_manage_account(account_id))',
      'Account managers can delete account ' || table_name,
      table_name
    );
  end loop;
end $$;

notify pgrst, 'reload schema';
