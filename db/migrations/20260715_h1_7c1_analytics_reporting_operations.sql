-- H1.7C1 Marketing VIP analytics reporting and operations
-- Depends on H1.7A and H1.7B analytics migrations.
-- Adds automated-source settings, sync history, retry visibility,
-- and additional goal metadata without changing existing event data.

alter table public.analytics_data_sources
  add column if not exists auto_sync_enabled boolean not null default true,
  add column if not exists sync_frequency text not null default 'daily',
  add column if not exists next_sync_at timestamptz;

alter table public.analytics_data_sources
  drop constraint if exists analytics_data_sources_sync_frequency_check;

alter table public.analytics_data_sources
  add constraint analytics_data_sources_sync_frequency_check
  check (sync_frequency in ('manual', 'daily'));

update public.analytics_data_sources
set next_sync_at = coalesce(next_sync_at, now())
where status = 'active'
  and auto_sync_enabled = true;

alter table public.analytics_goals
  add column if not exists description text,
  add column if not exists updated_by uuid references auth.users(id) on delete set null;

create table if not exists public.analytics_sync_runs (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  source_id uuid references public.analytics_data_sources(id) on delete cascade,
  source_type text not null check (source_type in ('native', 'ga4')),
  trigger_type text not null default 'manual'
    check (trigger_type in ('initial', 'manual', 'scheduled', 'retry')),
  status text not null default 'running'
    check (status in ('running', 'completed', 'failed')),
  start_date date not null,
  end_date date not null,
  rows_processed bigint not null default 0 check (rows_processed >= 0),
  error_message text,
  details jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists analytics_sync_runs_account_started_idx
  on public.analytics_sync_runs(account_id, started_at desc);

create index if not exists analytics_sync_runs_source_started_idx
  on public.analytics_sync_runs(source_id, started_at desc)
  where source_id is not null;

create index if not exists analytics_daily_metrics_asset_idx
  on public.analytics_daily_metrics(account_id, asset_id, metric_date desc)
  where asset_id is not null;

alter table public.analytics_sync_runs enable row level security;

drop policy if exists "Account members can view analytics sync runs"
  on public.analytics_sync_runs;
create policy "Account members can view analytics sync runs"
on public.analytics_sync_runs
for select
to authenticated
using (
  account_id is not null
  and public.user_can_view_account(account_id)
);

-- Sync runs are written only by guarded server routes using the service role.
revoke insert, update, delete on table public.analytics_sync_runs from anon, authenticated;
grant select on table public.analytics_sync_runs to authenticated;

notify pgrst, 'reload schema';
