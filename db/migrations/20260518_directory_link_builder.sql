-- Rudys VIP Directory Link Builder MVP
-- Run in Supabase SQL Editor or through your migration workflow.

create extension if not exists "pgcrypto";

create table if not exists public.directory_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  profile_name text not null default 'Web Search Pros Directory Profile',
  business_name text not null,
  website_url text not null,
  business_email text,
  phone text,
  address text,
  service_area text,
  logo_url text,
  short_description text,
  long_description text,
  categories text[] default '{}',
  services text[] default '{}',
  social_links jsonb not null default '{}'::jsonb,
  anchor_text_options text[] default '{}',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists directory_profiles_set_updated_at on public.directory_profiles;
create trigger directory_profiles_set_updated_at before update on public.directory_profiles
for each row execute function public.set_updated_at();

create table if not exists public.directory_opportunities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  domain text not null,
  url text not null,
  submit_url text,
  directory_name text,
  directory_type text not null default 'general',
  category text,
  discovery_source text not null default 'manual',
  relevance_score integer default 0,
  quality_score integer default 0,
  risk_score integer default 0,
  ai_summary text,
  submission_requirements text,
  notes text,
  status text not null default 'discovered',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint directory_opportunities_status_check check (status in ('discovered','qualified','approved','rejected','submitted','live','archived')),
  constraint directory_opportunities_type_check check (directory_type in ('general','local','industry','association','partner','vendor','resource','citation','other'))
);

drop trigger if exists directory_opportunities_set_updated_at on public.directory_opportunities;
create trigger directory_opportunities_set_updated_at before update on public.directory_opportunities
for each row execute function public.set_updated_at();

create table if not exists public.directory_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  opportunity_id uuid references public.directory_opportunities(id) on delete cascade,
  profile_id uuid references public.directory_profiles(id) on delete set null,
  submission_url text,
  submitted_url text,
  prepared_title text,
  prepared_description text,
  prepared_category text,
  prepared_anchor_text text,
  submitted_at timestamptz,
  live_url text,
  status text not null default 'draft',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint directory_submissions_status_check check (status in ('draft','ready_for_review','approved','submitted','pending_review','live','rejected','needs_follow_up','archived'))
);

drop trigger if exists directory_submissions_set_updated_at on public.directory_submissions;
create trigger directory_submissions_set_updated_at before update on public.directory_submissions
for each row execute function public.set_updated_at();

create table if not exists public.acquired_backlinks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  opportunity_id uuid references public.directory_opportunities(id) on delete set null,
  submission_id uuid references public.directory_submissions(id) on delete set null,
  source_domain text not null,
  source_url text not null,
  target_url text not null,
  anchor_text text,
  link_type text not null default 'unknown',
  first_seen_at timestamptz,
  last_checked_at timestamptz,
  status text not null default 'unverified',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint acquired_backlinks_status_check check (status in ('unverified','live','not_found','nofollow','removed','needs_review')),
  constraint acquired_backlinks_link_type_check check (link_type in ('unknown','follow','nofollow','sponsored','ugc'))
);

drop trigger if exists acquired_backlinks_set_updated_at on public.acquired_backlinks;
create trigger acquired_backlinks_set_updated_at before update on public.acquired_backlinks
for each row execute function public.set_updated_at();

create index if not exists idx_directory_profiles_user_id on public.directory_profiles(user_id);
create index if not exists idx_directory_opportunities_user_id on public.directory_opportunities(user_id);
create index if not exists idx_directory_opportunities_status on public.directory_opportunities(status);
create index if not exists idx_directory_submissions_user_id on public.directory_submissions(user_id);
create index if not exists idx_directory_submissions_status on public.directory_submissions(status);
create index if not exists idx_acquired_backlinks_user_id on public.acquired_backlinks(user_id);
create index if not exists idx_acquired_backlinks_status on public.acquired_backlinks(status);

alter table public.directory_profiles enable row level security;
alter table public.directory_opportunities enable row level security;
alter table public.directory_submissions enable row level security;
alter table public.acquired_backlinks enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='directory_profiles' and policyname='Users can manage their own directory profiles') then
    create policy "Users can manage their own directory profiles" on public.directory_profiles for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='directory_opportunities' and policyname='Users can manage their own directory opportunities') then
    create policy "Users can manage their own directory opportunities" on public.directory_opportunities for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='directory_submissions' and policyname='Users can manage their own directory submissions') then
    create policy "Users can manage their own directory submissions" on public.directory_submissions for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='acquired_backlinks' and policyname='Users can manage their own acquired backlinks') then
    create policy "Users can manage their own acquired backlinks" on public.acquired_backlinks for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
  end if;
end $$;
