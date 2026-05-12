-- Rudys VIP Database Schema
-- Product: Rudy's Marketing Twin
-- Sprint 1 foundation with profile trigger, tables, indexes, and RLS policies.

create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text default 'Rudy McCormick',
  timezone text default 'America/Chicago',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, timezone)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', 'Rudy McCormick'), 'America/Chicago')
  on conflict (id) do update set
    email = excluded.email,
    updated_at = now();
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create table if not exists public.digital_clone_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null default 'Rudy’s Marketing Twin',
  purpose text not null,
  voice_summary text,
  business_summary text,
  audience_summary text,
  offer_summary text,
  sales_outcome_summary text,
  approval_rules jsonb not null default '{}'::jsonb,
  forbidden_actions jsonb not null default '[]'::jsonb,
  preferred_style jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists digital_clone_profiles_set_updated_at on public.digital_clone_profiles;
create trigger digital_clone_profiles_set_updated_at before update on public.digital_clone_profiles for each row execute function public.set_updated_at();

create table if not exists public.service_lines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  short_name text,
  description text,
  primary_outcome text,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists service_lines_set_updated_at on public.service_lines;
create trigger service_lines_set_updated_at before update on public.service_lines for each row execute function public.set_updated_at();

create table if not exists public.buyer_segments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  description text,
  common_pains text[] default '{}',
  desired_outcomes text[] default '{}',
  objections text[] default '{}',
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists buyer_segments_set_updated_at on public.buyer_segments;
create trigger buyer_segments_set_updated_at before update on public.buyer_segments for each row execute function public.set_updated_at();

create table if not exists public.offers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  service_line_id uuid references public.service_lines(id) on delete set null,
  name text not null,
  description text,
  target_buyer_segments text[] default '{}',
  offer_type text not null default 'project',
  primary_cta text,
  outcome text,
  price_notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint offers_offer_type_check check (offer_type in ('project', 'retainer', 'audit', 'consulting', 'hybrid'))
);

drop trigger if exists offers_set_updated_at on public.offers;
create trigger offers_set_updated_at before update on public.offers for each row execute function public.set_updated_at();

create table if not exists public.brand_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  category text not null,
  rule_text text not null,
  priority integer not null default 1,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists brand_rules_set_updated_at on public.brand_rules;
create trigger brand_rules_set_updated_at before update on public.brand_rules for each row execute function public.set_updated_at();

create table if not exists public.content_examples (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  source text,
  content text not null,
  content_type text not null,
  tags text[] default '{}',
  approved boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists content_examples_set_updated_at on public.content_examples;
create trigger content_examples_set_updated_at before update on public.content_examples for each row execute function public.set_updated_at();

create table if not exists public.knowledge_sources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  source_type text not null,
  source_url text,
  content text not null,
  summary text,
  tags text[] default '{}',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint knowledge_sources_source_type_check check (source_type in ('website', 'blog', 'service_page', 'email', 'social_post', 'proposal', 'script', 'case_study', 'testimonial', 'manual_note', 'other'))
);

drop trigger if exists knowledge_sources_set_updated_at on public.knowledge_sources;
create trigger knowledge_sources_set_updated_at before update on public.knowledge_sources for each row execute function public.set_updated_at();

create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  service_line_id uuid references public.service_lines(id) on delete set null,
  offer_id uuid references public.offers(id) on delete set null,
  name text not null,
  idea text not null,
  buyer_segment text,
  audience text,
  goal text,
  platforms text[] default '{}',
  tone text,
  cta text,
  notes text,
  strategy jsonb not null default '{}'::jsonb,
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint campaigns_status_check check (status in ('draft', 'asset_pack_generated', 'in_review', 'approved', 'active', 'archived'))
);

drop trigger if exists campaigns_set_updated_at on public.campaigns;
create trigger campaigns_set_updated_at before update on public.campaigns for each row execute function public.set_updated_at();

create table if not exists public.generated_assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  campaign_id uuid references public.campaigns(id) on delete cascade,
  asset_type text not null,
  title text,
  content text not null,
  metadata jsonb not null default '{}'::jsonb,
  status text not null default 'needs_review',
  version integer not null default 1,
  parent_asset_id uuid references public.generated_assets(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint generated_assets_status_check check (status in ('draft', 'needs_review', 'approved', 'rejected', 'revision_requested', 'published', 'sent', 'archived'))
);

drop trigger if exists generated_assets_set_updated_at on public.generated_assets;
create trigger generated_assets_set_updated_at before update on public.generated_assets for each row execute function public.set_updated_at();

create table if not exists public.approvals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  asset_id uuid not null references public.generated_assets(id) on delete cascade,
  status text not null,
  notes text,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  constraint approvals_status_check check (status in ('pending', 'approved', 'rejected', 'revision_requested'))
);

create table if not exists public.prospects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  company_name text,
  contact_name text,
  email text,
  phone text,
  website text,
  industry text,
  buyer_segment text,
  source text,
  notes text,
  status text not null default 'new',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint prospects_status_check check (status in ('new', 'researching', 'contacted', 'qualified', 'unqualified', 'active_opportunity', 'customer', 'archived'))
);

drop trigger if exists prospects_set_updated_at on public.prospects;
create trigger prospects_set_updated_at before update on public.prospects for each row execute function public.set_updated_at();

create table if not exists public.opportunities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  prospect_id uuid references public.prospects(id) on delete set null,
  name text not null,
  service_line_id uuid references public.service_lines(id) on delete set null,
  offer_id uuid references public.offers(id) on delete set null,
  opportunity_type text not null default 'project',
  estimated_value numeric(12,2),
  stage text not null default 'new',
  next_step text,
  close_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint opportunities_type_check check (opportunity_type in ('project', 'retainer', 'audit', 'consulting', 'hybrid')),
  constraint opportunities_stage_check check (stage in ('new', 'qualified', 'discovery_scheduled', 'proposal_needed', 'proposal_sent', 'negotiation', 'won', 'lost', 'paused'))
);

drop trigger if exists opportunities_set_updated_at on public.opportunities;
create trigger opportunities_set_updated_at before update on public.opportunities for each row execute function public.set_updated_at();

create table if not exists public.prompt_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  description text,
  template text not null,
  input_schema jsonb not null default '{}'::jsonb,
  output_schema jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists prompt_templates_set_updated_at on public.prompt_templates;
create trigger prompt_templates_set_updated_at before update on public.prompt_templates for each row execute function public.set_updated_at();

create table if not exists public.tool_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  provider text not null,
  action_name text not null,
  status text not null default 'planned',
  input jsonb not null default '{}'::jsonb,
  output jsonb not null default '{}'::jsonb,
  error text,
  requires_approval boolean not null default true,
  approved_by_user boolean not null default false,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint tool_runs_provider_check check (provider in ('internal_ai', 'galaxyai', 'zapier_mcp', 'manual')),
  constraint tool_runs_status_check check (status in ('planned', 'waiting_approval', 'running', 'completed', 'failed', 'canceled'))
);

create table if not exists public.galaxyai_workflows (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  galaxy_workflow_id text not null,
  name text not null,
  description text,
  metadata jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, galaxy_workflow_id)
);

drop trigger if exists galaxyai_workflows_set_updated_at on public.galaxyai_workflows;
create trigger galaxyai_workflows_set_updated_at before update on public.galaxyai_workflows for each row execute function public.set_updated_at();

create table if not exists public.galaxyai_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  campaign_id uuid references public.campaigns(id) on delete set null,
  asset_id uuid references public.generated_assets(id) on delete set null,
  galaxy_run_id text,
  galaxy_workflow_id text,
  status text not null default 'queued',
  input jsonb not null default '{}'::jsonb,
  output jsonb not null default '{}'::jsonb,
  error text,
  webhook_received boolean not null default false,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint galaxyai_runs_status_check check (status in ('queued', 'running', 'completed', 'failed', 'canceled'))
);

drop trigger if exists galaxyai_runs_set_updated_at on public.galaxyai_runs;
create trigger galaxyai_runs_set_updated_at before update on public.galaxyai_runs for each row execute function public.set_updated_at();

create table if not exists public.zapier_action_policies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  app_name text not null,
  action_name text not null,
  risk_level text not null default 'medium',
  approval_required boolean not null default true,
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint zapier_action_policies_risk_check check (risk_level in ('low', 'medium', 'high'))
);

drop trigger if exists zapier_action_policies_set_updated_at on public.zapier_action_policies;
create trigger zapier_action_policies_set_updated_at before update on public.zapier_action_policies for each row execute function public.set_updated_at();

create table if not exists public.activity_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  activity_type text not null,
  title text not null,
  description text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_service_lines_user_id on public.service_lines(user_id);
create index if not exists idx_buyer_segments_user_id on public.buyer_segments(user_id);
create index if not exists idx_offers_user_id on public.offers(user_id);
create index if not exists idx_brand_rules_user_id on public.brand_rules(user_id);
create index if not exists idx_content_examples_user_id on public.content_examples(user_id);
create index if not exists idx_knowledge_sources_user_id on public.knowledge_sources(user_id);
create index if not exists idx_campaigns_user_id on public.campaigns(user_id);
create index if not exists idx_campaigns_status on public.campaigns(status);
create index if not exists idx_generated_assets_user_id on public.generated_assets(user_id);
create index if not exists idx_generated_assets_campaign_id on public.generated_assets(campaign_id);
create index if not exists idx_generated_assets_status on public.generated_assets(status);
create index if not exists idx_approvals_user_id on public.approvals(user_id);
create index if not exists idx_prospects_user_id on public.prospects(user_id);
create index if not exists idx_opportunities_user_id on public.opportunities(user_id);
create index if not exists idx_tool_runs_user_id on public.tool_runs(user_id);
create index if not exists idx_tool_runs_status on public.tool_runs(status);
create index if not exists idx_galaxyai_runs_user_id on public.galaxyai_runs(user_id);
create index if not exists idx_galaxyai_runs_status on public.galaxyai_runs(status);
create index if not exists idx_activity_log_user_id on public.activity_log(user_id);

alter table public.profiles enable row level security;
alter table public.digital_clone_profiles enable row level security;
alter table public.service_lines enable row level security;
alter table public.buyer_segments enable row level security;
alter table public.offers enable row level security;
alter table public.brand_rules enable row level security;
alter table public.content_examples enable row level security;
alter table public.knowledge_sources enable row level security;
alter table public.campaigns enable row level security;
alter table public.generated_assets enable row level security;
alter table public.approvals enable row level security;
alter table public.prospects enable row level security;
alter table public.opportunities enable row level security;
alter table public.prompt_templates enable row level security;
alter table public.tool_runs enable row level security;
alter table public.galaxyai_workflows enable row level security;
alter table public.galaxyai_runs enable row level security;
alter table public.zapier_action_policies enable row level security;
alter table public.activity_log enable row level security;

-- Drop and recreate policies so this file can be rerun during development.
drop policy if exists "Users can view their own profile" on public.profiles;
drop policy if exists "Users can update their own profile" on public.profiles;
drop policy if exists "Users can insert their own profile" on public.profiles;

create policy "Users can view their own profile" on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy "Users can update their own profile" on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy "Users can insert their own profile" on public.profiles for insert to authenticated with check ((select auth.uid()) = id);

do $$
declare
  table_name text;
  view_policy text;
  insert_policy text;
  update_policy text;
  delete_policy text;
begin
  foreach table_name in array array[
    'digital_clone_profiles', 'service_lines', 'buyer_segments', 'offers', 'brand_rules',
    'content_examples', 'knowledge_sources', 'campaigns', 'generated_assets', 'approvals',
    'prospects', 'opportunities', 'prompt_templates', 'tool_runs', 'galaxyai_workflows',
    'galaxyai_runs', 'zapier_action_policies', 'activity_log'
  ] loop
    view_policy := 'Users can view their own ' || table_name;
    insert_policy := 'Users can insert their own ' || table_name;
    update_policy := 'Users can update their own ' || table_name;
    delete_policy := 'Users can delete their own ' || table_name;

    execute format('drop policy if exists %I on public.%I', view_policy, table_name);
    execute format('drop policy if exists %I on public.%I', insert_policy, table_name);
    execute format('drop policy if exists %I on public.%I', update_policy, table_name);
    execute format('drop policy if exists %I on public.%I', delete_policy, table_name);

    execute format('create policy %I on public.%I for select to authenticated using ((select auth.uid()) = user_id)', view_policy, table_name);
    execute format('create policy %I on public.%I for insert to authenticated with check ((select auth.uid()) = user_id)', insert_policy, table_name);
    execute format('create policy %I on public.%I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', update_policy, table_name);
    execute format('create policy %I on public.%I for delete to authenticated using ((select auth.uid()) = user_id)', delete_policy, table_name);
  end loop;
end $$;
