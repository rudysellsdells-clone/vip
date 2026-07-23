-- H1.15: Account-scoped Market Intelligence foundation
-- Stores research projects, cited sources, and approval-controlled findings.

create extension if not exists "pgcrypto";

create table if not exists public.market_research_projects (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  created_by_user_id uuid references public.profiles(id) on delete set null,
  title text not null,
  objective text,
  industry text,
  geography text,
  status text not null default 'draft',
  started_at timestamptz,
  completed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint market_research_projects_status_check
    check (status in ('draft', 'active', 'complete', 'archived')),
  constraint market_research_projects_id_account_unique
    unique (id, account_id)
);

create table if not exists public.market_research_sources (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  project_id uuid,
  created_by_user_id uuid references public.profiles(id) on delete set null,
  source_type text not null default 'web',
  title text not null,
  source_url text,
  publisher text,
  author text,
  published_at timestamptz,
  retrieved_at timestamptz not null default now(),
  summary text,
  credibility_score integer,
  active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint market_research_sources_project_account_fk
    foreign key (project_id, account_id)
    references public.market_research_projects(id, account_id)
    on delete cascade,
  constraint market_research_sources_type_check
    check (source_type in ('web', 'document', 'interview', 'analytics', 'manual')),
  constraint market_research_sources_credibility_check
    check (credibility_score is null or credibility_score between 0 and 100)
);

create table if not exists public.market_research_findings (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  project_id uuid,
  created_by_user_id uuid references public.profiles(id) on delete set null,
  approved_by_user_id uuid references public.profiles(id) on delete set null,
  finding_type text not null,
  title text not null,
  summary text not null,
  evidence text,
  geography text,
  confidence_score integer,
  status text not null default 'draft',
  source_ids uuid[] not null default '{}'::uuid[],
  approved_at timestamptz,
  rejected_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint market_research_findings_project_account_fk
    foreign key (project_id, account_id)
    references public.market_research_projects(id, account_id)
    on delete cascade,
  constraint market_research_findings_type_check
    check (finding_type in (
      'competitor',
      'search_demand',
      'market_opportunity',
      'audience_insight',
      'trend',
      'risk',
      'proof'
    )),
  constraint market_research_findings_status_check
    check (status in ('draft', 'approved', 'rejected', 'archived')),
  constraint market_research_findings_confidence_check
    check (confidence_score is null or confidence_score between 0 and 100)
);

create index if not exists idx_market_research_projects_account
  on public.market_research_projects(account_id, status, updated_at desc);
create index if not exists idx_market_research_sources_account
  on public.market_research_sources(account_id, active, retrieved_at desc);
create index if not exists idx_market_research_sources_project
  on public.market_research_sources(project_id, retrieved_at desc);
create index if not exists idx_market_research_findings_account
  on public.market_research_findings(account_id, status, finding_type, updated_at desc);
create index if not exists idx_market_research_findings_project
  on public.market_research_findings(project_id, status, updated_at desc);

alter table public.market_research_projects enable row level security;
alter table public.market_research_sources enable row level security;
alter table public.market_research_findings enable row level security;

drop policy if exists "Users can view accessible market research projects"
  on public.market_research_projects;
drop policy if exists "Managers can create market research projects"
  on public.market_research_projects;
drop policy if exists "Managers can update market research projects"
  on public.market_research_projects;
drop policy if exists "Managers can delete market research projects"
  on public.market_research_projects;

create policy "Users can view accessible market research projects"
  on public.market_research_projects for select to authenticated
  using (public.user_can_view_account(account_id));
create policy "Managers can create market research projects"
  on public.market_research_projects for insert to authenticated
  with check (public.user_can_manage_account(account_id));
create policy "Managers can update market research projects"
  on public.market_research_projects for update to authenticated
  using (public.user_can_manage_account(account_id))
  with check (public.user_can_manage_account(account_id));
create policy "Managers can delete market research projects"
  on public.market_research_projects for delete to authenticated
  using (public.user_can_manage_account(account_id));

drop policy if exists "Users can view accessible market research sources"
  on public.market_research_sources;
drop policy if exists "Managers can create market research sources"
  on public.market_research_sources;
drop policy if exists "Managers can update market research sources"
  on public.market_research_sources;
drop policy if exists "Managers can delete market research sources"
  on public.market_research_sources;

create policy "Users can view accessible market research sources"
  on public.market_research_sources for select to authenticated
  using (public.user_can_view_account(account_id));
create policy "Managers can create market research sources"
  on public.market_research_sources for insert to authenticated
  with check (public.user_can_manage_account(account_id));
create policy "Managers can update market research sources"
  on public.market_research_sources for update to authenticated
  using (public.user_can_manage_account(account_id))
  with check (public.user_can_manage_account(account_id));
create policy "Managers can delete market research sources"
  on public.market_research_sources for delete to authenticated
  using (public.user_can_manage_account(account_id));

drop policy if exists "Users can view accessible market research findings"
  on public.market_research_findings;
drop policy if exists "Managers can create market research findings"
  on public.market_research_findings;
drop policy if exists "Managers can update market research findings"
  on public.market_research_findings;
drop policy if exists "Managers can delete market research findings"
  on public.market_research_findings;

create policy "Users can view accessible market research findings"
  on public.market_research_findings for select to authenticated
  using (public.user_can_view_account(account_id));
create policy "Managers can create market research findings"
  on public.market_research_findings for insert to authenticated
  with check (public.user_can_manage_account(account_id));
create policy "Managers can update market research findings"
  on public.market_research_findings for update to authenticated
  using (public.user_can_manage_account(account_id))
  with check (public.user_can_manage_account(account_id));
create policy "Managers can delete market research findings"
  on public.market_research_findings for delete to authenticated
  using (public.user_can_manage_account(account_id));

drop trigger if exists market_research_projects_set_updated_at
  on public.market_research_projects;
create trigger market_research_projects_set_updated_at
  before update on public.market_research_projects
  for each row execute function public.set_updated_at();

drop trigger if exists market_research_sources_set_updated_at
  on public.market_research_sources;
create trigger market_research_sources_set_updated_at
  before update on public.market_research_sources
  for each row execute function public.set_updated_at();

drop trigger if exists market_research_findings_set_updated_at
  on public.market_research_findings;
create trigger market_research_findings_set_updated_at
  before update on public.market_research_findings
  for each row execute function public.set_updated_at();
