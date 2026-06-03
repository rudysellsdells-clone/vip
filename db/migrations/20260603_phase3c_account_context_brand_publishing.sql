-- Phase 3C: Account context, account brand profiles, and publishing settings
-- Adds per-account brand/publishing configuration and keeps the multi-account foundation additive.

create extension if not exists "pgcrypto";

-- Brand profile per account. This is the account-specific source of truth for campaign generation context.
create table if not exists public.account_brand_profiles (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  company_name text,
  website_url text,
  primary_cta text,
  phone text,
  target_audience text,
  tone text,
  service_areas text,
  core_offers text,
  approved_hashtags text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint account_brand_profiles_account_unique unique (account_id)
);

-- Publishing settings per account. Keep platform connections/settings separate by client workspace.
create table if not exists public.account_publishing_settings (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  linkedin_page_name text,
  linkedin_company_id text,
  facebook_page_name text,
  facebook_page_id text,
  primary_booking_url text,
  galaxyai_style text,
  default_hashtags text,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint account_publishing_settings_account_unique unique (account_id)
);

create index if not exists idx_account_brand_profiles_account_id on public.account_brand_profiles(account_id);
create index if not exists idx_account_publishing_settings_account_id on public.account_publishing_settings(account_id);

-- Reuse existing timestamp trigger helper used elsewhere in VIP.
drop trigger if exists account_brand_profiles_set_updated_at on public.account_brand_profiles;
create trigger account_brand_profiles_set_updated_at
before update on public.account_brand_profiles
for each row execute function public.set_updated_at();

drop trigger if exists account_publishing_settings_set_updated_at on public.account_publishing_settings;
create trigger account_publishing_settings_set_updated_at
before update on public.account_publishing_settings
for each row execute function public.set_updated_at();

-- Seed account-level profile/settings records from existing account rows.
insert into public.account_brand_profiles (
  account_id,
  company_name,
  website_url,
  primary_cta,
  tone,
  notes
)
select
  a.id,
  a.name,
  a.website_url,
  a.primary_cta,
  'Practical, credible, helpful, and professional.',
  'Created by Phase 3C account context migration.'
from public.accounts a
where not exists (
  select 1
  from public.account_brand_profiles bp
  where bp.account_id = a.id
);

insert into public.account_publishing_settings (
  account_id,
  primary_booking_url,
  galaxyai_style,
  settings
)
select
  a.id,
  a.primary_cta,
  'Polished short-form social video, business-focused, clean motion, no exaggerated claims.',
  jsonb_build_object('created_by_migration', '20260603_phase3c_account_context_brand_publishing')
from public.accounts a
where not exists (
  select 1
  from public.account_publishing_settings ps
  where ps.account_id = a.id
);

alter table public.account_brand_profiles enable row level security;
alter table public.account_publishing_settings enable row level security;

-- Brand profile policies.
drop policy if exists "Users can view accessible account brand profiles" on public.account_brand_profiles;
drop policy if exists "Account managers can insert brand profiles" on public.account_brand_profiles;
drop policy if exists "Account managers can update brand profiles" on public.account_brand_profiles;

create policy "Users can view accessible account brand profiles"
on public.account_brand_profiles
for select
to authenticated
using (public.user_can_view_account(account_id));

create policy "Account managers can insert brand profiles"
on public.account_brand_profiles
for insert
to authenticated
with check (public.user_can_manage_account(account_id));

create policy "Account managers can update brand profiles"
on public.account_brand_profiles
for update
to authenticated
using (public.user_can_manage_account(account_id))
with check (public.user_can_manage_account(account_id));

-- Publishing settings policies.
drop policy if exists "Users can view accessible account publishing settings" on public.account_publishing_settings;
drop policy if exists "Account managers can insert publishing settings" on public.account_publishing_settings;
drop policy if exists "Account managers can update publishing settings" on public.account_publishing_settings;

create policy "Users can view accessible account publishing settings"
on public.account_publishing_settings
for select
to authenticated
using (public.user_can_view_account(account_id));

create policy "Account managers can insert publishing settings"
on public.account_publishing_settings
for insert
to authenticated
with check (public.user_can_manage_account(account_id));

create policy "Account managers can update publishing settings"
on public.account_publishing_settings
for update
to authenticated
using (public.user_can_manage_account(account_id))
with check (public.user_can_manage_account(account_id));
