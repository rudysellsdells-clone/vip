-- Rudys VIP Sprint 2.9
-- Tracks approved content execution attempts for publishing/outreach readiness.

create extension if not exists "pgcrypto";

create table if not exists public.publishing_execution_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  asset_id uuid not null references public.generated_assets(id) on delete cascade,
  provider text not null,
  channel text not null,
  action_key text not null,
  status text not null default 'prepared',
  destination text,
  instructions text,
  params jsonb not null default '{}'::jsonb,
  provider_result jsonb,
  error text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint publishing_execution_runs_provider_check check (
    provider in ('zapier_mcp', 'galaxyai', 'manual', 'other')
  ),
  constraint publishing_execution_runs_status_check check (
    status in ('prepared', 'sent_to_provider', 'completed', 'failed', 'skipped')
  )
);

drop trigger if exists publishing_execution_runs_set_updated_at on public.publishing_execution_runs;
create trigger publishing_execution_runs_set_updated_at
before update on public.publishing_execution_runs
for each row execute function public.set_updated_at();

create index if not exists idx_publishing_execution_runs_user_id on public.publishing_execution_runs(user_id);
create index if not exists idx_publishing_execution_runs_asset_id on public.publishing_execution_runs(asset_id);
create index if not exists idx_publishing_execution_runs_channel on public.publishing_execution_runs(channel);
create index if not exists idx_publishing_execution_runs_status on public.publishing_execution_runs(status);

alter table public.publishing_execution_runs enable row level security;

drop policy if exists "Users can view their own publishing execution runs" on public.publishing_execution_runs;
create policy "Users can view their own publishing execution runs"
on public.publishing_execution_runs for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert their own publishing execution runs" on public.publishing_execution_runs;
create policy "Users can insert their own publishing execution runs"
on public.publishing_execution_runs for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own publishing execution runs" on public.publishing_execution_runs;
create policy "Users can update their own publishing execution runs"
on public.publishing_execution_runs for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own publishing execution runs" on public.publishing_execution_runs;
create policy "Users can delete their own publishing execution runs"
on public.publishing_execution_runs for delete
to authenticated
using ((select auth.uid()) = user_id);
