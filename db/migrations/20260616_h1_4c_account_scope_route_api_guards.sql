-- H1.4C Account-scoped route/API guard support
-- Strengthens database-side account checks for account-aware tables.
-- This is additive: legacy user_id policies remain in place for older rows.

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
        and a.status <> 'archived'
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
        and a.status <> 'archived'
        and (
          a.owner_user_id = auth.uid()
          or exists (
            select 1
            from public.account_memberships m
            where m.account_id = a.id
              and m.user_id = auth.uid()
              and m.role in ('owner', 'admin')
              and m.status = 'active'
              and m.removed_at is null
          )
        )
    );
$$;

-- Campaigns.
alter table public.campaigns enable row level security;

drop policy if exists "Account members can view account campaigns" on public.campaigns;
create policy "Account members can view account campaigns"
on public.campaigns
for select
to authenticated
using (
  account_id is not null
  and public.user_can_view_account(account_id)
);

drop policy if exists "Account managers can insert account campaigns" on public.campaigns;
create policy "Account managers can insert account campaigns"
on public.campaigns
for insert
to authenticated
with check (
  account_id is not null
  and public.user_can_manage_account(account_id)
);

drop policy if exists "Account managers can update account campaigns" on public.campaigns;
create policy "Account managers can update account campaigns"
on public.campaigns
for update
to authenticated
using (
  account_id is not null
  and public.user_can_manage_account(account_id)
)
with check (
  account_id is not null
  and public.user_can_manage_account(account_id)
);

drop policy if exists "Account managers can delete account campaigns" on public.campaigns;
create policy "Account managers can delete account campaigns"
on public.campaigns
for delete
to authenticated
using (
  account_id is not null
  and public.user_can_manage_account(account_id)
);

-- Generated assets.
alter table public.generated_assets enable row level security;

drop policy if exists "Account members can view account assets" on public.generated_assets;
create policy "Account members can view account assets"
on public.generated_assets
for select
to authenticated
using (
  account_id is not null
  and public.user_can_view_account(account_id)
);

drop policy if exists "Account managers can insert account assets" on public.generated_assets;
create policy "Account managers can insert account assets"
on public.generated_assets
for insert
to authenticated
with check (
  account_id is not null
  and public.user_can_manage_account(account_id)
);

drop policy if exists "Account managers can update account assets" on public.generated_assets;
create policy "Account managers can update account assets"
on public.generated_assets
for update
to authenticated
using (
  account_id is not null
  and public.user_can_manage_account(account_id)
)
with check (
  account_id is not null
  and public.user_can_manage_account(account_id)
);

-- Account-scoped clone, strategy, knowledge, media, actions, and activity tables.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'digital_clone_profiles',
    'brand_rules',
    'content_examples',
    'knowledge_sources',
    'galaxyai_runs',
    'tool_runs',
    'activity_log'
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
  end loop;
end $$;

notify pgrst, 'reload schema';
