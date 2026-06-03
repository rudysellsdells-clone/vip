-- Phase 3B: Multi-account workspace foundation
-- Adds real client/workspace accounts, memberships, pending invitations, and account_id fields.

create extension if not exists "pgcrypto";

alter table public.profiles
  add column if not exists platform_role text not null default 'user',
  add column if not exists default_account_id uuid,
  add column if not exists last_active_account_id uuid;

alter table public.profiles
  drop constraint if exists profiles_platform_role_check;

alter table public.profiles
  add constraint profiles_platform_role_check
  check (platform_role in ('owner', 'admin', 'user'));

-- Existing users are treated as platform owners for the current private/beta build.
-- Future invited users remain platform_role = 'user' unless promoted manually.
update public.profiles
set platform_role = 'owner'
where platform_role = 'user';

create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  website_url text,
  primary_cta text,
  status text not null default 'active',
  owner_user_id uuid not null references public.profiles(id) on delete cascade,
  created_by_user_id uuid references public.profiles(id) on delete set null,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint accounts_status_check check (status in ('active', 'paused', 'archived'))
);

create table if not exists public.account_memberships (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  email text not null,
  full_name text,
  role text not null default 'viewer',
  status text not null default 'pending',
  invited_by_user_id uuid references public.profiles(id) on delete set null,
  invited_at timestamptz not null default now(),
  accepted_at timestamptz,
  removed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint account_memberships_role_check check (role in ('owner', 'admin', 'editor', 'reviewer', 'viewer')),
  constraint account_memberships_status_check check (status in ('pending', 'active', 'removed'))
);

create unique index if not exists account_memberships_active_email_unique
on public.account_memberships (account_id, lower(email))
where removed_at is null;

create index if not exists idx_accounts_owner_user_id on public.accounts(owner_user_id);
create index if not exists idx_account_memberships_account_id on public.account_memberships(account_id);
create index if not exists idx_account_memberships_user_id on public.account_memberships(user_id);
create index if not exists idx_account_memberships_email on public.account_memberships(lower(email));

drop trigger if exists accounts_set_updated_at on public.accounts;
create trigger accounts_set_updated_at
before update on public.accounts
for each row execute function public.set_updated_at();

drop trigger if exists account_memberships_set_updated_at on public.account_memberships;
create trigger account_memberships_set_updated_at
before update on public.account_memberships
for each row execute function public.set_updated_at();

-- Add account_id to core content tables as a foundation. Existing user_id filters remain in app code for now.
alter table public.campaigns add column if not exists account_id uuid references public.accounts(id) on delete set null;
alter table public.generated_assets add column if not exists account_id uuid references public.accounts(id) on delete set null;
alter table public.digital_clone_profiles add column if not exists account_id uuid references public.accounts(id) on delete set null;
alter table public.service_lines add column if not exists account_id uuid references public.accounts(id) on delete set null;
alter table public.buyer_segments add column if not exists account_id uuid references public.accounts(id) on delete set null;
alter table public.offers add column if not exists account_id uuid references public.accounts(id) on delete set null;
alter table public.brand_rules add column if not exists account_id uuid references public.accounts(id) on delete set null;
alter table public.content_examples add column if not exists account_id uuid references public.accounts(id) on delete set null;
alter table public.knowledge_sources add column if not exists account_id uuid references public.accounts(id) on delete set null;
alter table public.galaxyai_runs add column if not exists account_id uuid references public.accounts(id) on delete set null;
alter table public.tool_runs add column if not exists account_id uuid references public.accounts(id) on delete set null;
alter table public.activity_log add column if not exists account_id uuid references public.accounts(id) on delete set null;

create index if not exists idx_campaigns_account_id on public.campaigns(account_id);
create index if not exists idx_generated_assets_account_id on public.generated_assets(account_id);
create index if not exists idx_activity_log_account_id on public.activity_log(account_id);
create index if not exists idx_tool_runs_account_id on public.tool_runs(account_id);

-- Create one default account for each existing profile if missing.
insert into public.accounts (name, slug, owner_user_id, created_by_user_id, primary_cta, settings)
select
  coalesce(nullif(p.full_name, ''), split_part(coalesce(p.email, 'vip-user'), '@', 1), 'VIP User') || ' Workspace',
  'workspace-' || replace(p.id::text, '-', ''),
  p.id,
  p.id,
  null,
  jsonb_build_object('created_by_migration', '20260603_phase3b_multi_account_workspaces')
from public.profiles p
where not exists (
  select 1 from public.accounts a where a.owner_user_id = p.id
);

insert into public.account_memberships (account_id, user_id, email, full_name, role, status, invited_by_user_id, accepted_at)
select
  a.id,
  p.id,
  coalesce(p.email, 'unknown-' || p.id::text || '@example.invalid'),
  p.full_name,
  'owner',
  'active',
  p.id,
  now()
from public.profiles p
join public.accounts a on a.owner_user_id = p.id
where not exists (
  select 1
  from public.account_memberships m
  where m.account_id = a.id
    and m.user_id = p.id
    and m.removed_at is null
);

update public.profiles p
set
  default_account_id = coalesce(p.default_account_id, a.id),
  last_active_account_id = coalesce(p.last_active_account_id, a.id)
from public.accounts a
where a.owner_user_id = p.id;

update public.campaigns c
set account_id = a.id
from public.accounts a
where c.account_id is null
  and c.user_id = a.owner_user_id;

update public.generated_assets ga
set account_id = coalesce(
  (
    select c.account_id
    from public.campaigns c
    where c.id = ga.campaign_id
    limit 1
  ),
  a.id
)
from public.accounts a
where ga.account_id is null
  and ga.user_id = a.owner_user_id;

update public.digital_clone_profiles d
set account_id = a.id
from public.accounts a
where d.account_id is null and d.user_id = a.owner_user_id;

update public.service_lines s
set account_id = a.id
from public.accounts a
where s.account_id is null and s.user_id = a.owner_user_id;

update public.buyer_segments b
set account_id = a.id
from public.accounts a
where b.account_id is null and b.user_id = a.owner_user_id;

update public.offers o
set account_id = a.id
from public.accounts a
where o.account_id is null and o.user_id = a.owner_user_id;

update public.brand_rules br
set account_id = a.id
from public.accounts a
where br.account_id is null and br.user_id = a.owner_user_id;

update public.content_examples ce
set account_id = a.id
from public.accounts a
where ce.account_id is null and ce.user_id = a.owner_user_id;

update public.knowledge_sources ks
set account_id = a.id
from public.accounts a
where ks.account_id is null and ks.user_id = a.owner_user_id;

-- Access helpers used by RLS policies.
create or replace function public.user_can_view_account(target_account_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
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
  select exists (
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

alter table public.accounts enable row level security;
alter table public.account_memberships enable row level security;

drop policy if exists "Users can view accessible accounts" on public.accounts;
drop policy if exists "Users can create owned accounts" on public.accounts;
drop policy if exists "Owners and admins can update accounts" on public.accounts;

create policy "Users can view accessible accounts"
on public.accounts for select to authenticated
using (public.user_can_view_account(id));

create policy "Users can create owned accounts"
on public.accounts for insert to authenticated
with check (owner_user_id = (select auth.uid()));

create policy "Owners and admins can update accounts"
on public.accounts for update to authenticated
using (public.user_can_manage_account(id))
with check (public.user_can_manage_account(id));

drop policy if exists "Users can view accessible memberships" on public.account_memberships;
drop policy if exists "Owners and admins can create memberships" on public.account_memberships;
drop policy if exists "Owners and admins can update memberships" on public.account_memberships;

create policy "Users can view accessible memberships"
on public.account_memberships for select to authenticated
using (
  user_id = (select auth.uid())
  or public.user_can_manage_account(account_id)
);

create policy "Owners and admins can create memberships"
on public.account_memberships for insert to authenticated
with check (public.user_can_manage_account(account_id));

create policy "Owners and admins can update memberships"
on public.account_memberships for update to authenticated
using (public.user_can_manage_account(account_id))
with check (public.user_can_manage_account(account_id));

-- When an invited user signs up later, attach their profile to pending memberships by email.
create or replace function public.handle_new_user()
returns trigger as $$
declare
  default_account uuid;
begin
  insert into public.profiles (id, email, full_name, timezone)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', 'Rudy McCormick'), 'America/Chicago')
  on conflict (id) do update set
    email = excluded.email,
    updated_at = now();

  update public.account_memberships
  set
    user_id = new.id,
    status = 'active',
    accepted_at = coalesce(accepted_at, now()),
    updated_at = now()
  where user_id is null
    and lower(email) = lower(coalesce(new.email, ''))
    and status = 'pending'
    and removed_at is null;

  select a.id into default_account
  from public.accounts a
  where a.owner_user_id = new.id
  order by a.created_at asc
  limit 1;

  if default_account is null then
    insert into public.accounts (name, slug, owner_user_id, created_by_user_id, settings)
    values (
      coalesce(new.raw_user_meta_data->>'full_name', split_part(coalesce(new.email, 'VIP User'), '@', 1), 'VIP User') || ' Workspace',
      'workspace-' || replace(new.id::text, '-', ''),
      new.id,
      new.id,
      jsonb_build_object('created_by_trigger', true)
    )
    returning id into default_account;

    insert into public.account_memberships (account_id, user_id, email, full_name, role, status, invited_by_user_id, accepted_at)
    values (
      default_account,
      new.id,
      coalesce(new.email, 'unknown-' || new.id::text || '@example.invalid'),
      coalesce(new.raw_user_meta_data->>'full_name', 'VIP User'),
      'owner',
      'active',
      new.id,
      now()
    )
    on conflict do nothing;
  end if;

  update public.profiles
  set
    default_account_id = coalesce(default_account_id, default_account),
    last_active_account_id = coalesce(last_active_account_id, default_account)
  where id = new.id;

  return new;
end;
$$ language plpgsql security definer;

-- Keep existing trigger name in place.
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();
