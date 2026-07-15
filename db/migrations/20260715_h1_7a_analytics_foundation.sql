-- H1.7A Marketing VIP analytics foundation
-- Native-first analytics model with GA4-ready cached reporting.
-- This migration is additive and does not change existing campaign or asset behavior.

create extension if not exists pgcrypto;

create table if not exists public.analytics_data_sources (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  source_type text not null check (source_type in ('native', 'ga4')),
  status text not null default 'draft' check (status in ('draft', 'connecting', 'active', 'paused', 'error')),
  name text not null,
  website_url text,
  external_account_id text,
  external_property_id text,
  external_stream_id text,
  reporting_timezone text not null default 'America/Chicago',
  currency_code text not null default 'USD',
  settings jsonb not null default '{}'::jsonb,
  sync_cursor jsonb not null default '{}'::jsonb,
  last_synced_at timestamptz,
  last_error text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists analytics_data_sources_account_idx
  on public.analytics_data_sources(account_id, source_type, status);

create unique index if not exists analytics_data_sources_ga4_property_unique
  on public.analytics_data_sources(account_id, external_property_id)
  where source_type = 'ga4' and external_property_id is not null;

create table if not exists public.analytics_goals (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  name text not null,
  event_name text not null,
  goal_type text not null default 'conversion' check (goal_type in ('engagement', 'lead', 'conversion', 'revenue')),
  is_primary boolean not null default false,
  is_active boolean not null default true,
  default_value numeric(14, 2),
  currency_code text not null default 'USD',
  settings jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists analytics_goals_account_idx
  on public.analytics_goals(account_id, is_active, goal_type);

create unique index if not exists analytics_goals_account_event_unique
  on public.analytics_goals(account_id, event_name);

create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  source_id uuid references public.analytics_data_sources(id) on delete set null,
  event_name text not null,
  occurred_at timestamptz not null default now(),
  visitor_id text,
  session_id text,
  campaign_id uuid references public.campaigns(id) on delete set null,
  asset_id uuid references public.generated_assets(id) on delete set null,
  channel text,
  traffic_source text,
  traffic_medium text,
  campaign_name text,
  landing_url text,
  referrer_host text,
  value numeric(14, 2),
  currency_code text,
  dedupe_key text,
  properties jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists analytics_events_account_occurred_idx
  on public.analytics_events(account_id, occurred_at desc);

create index if not exists analytics_events_account_event_idx
  on public.analytics_events(account_id, event_name, occurred_at desc);

create index if not exists analytics_events_campaign_idx
  on public.analytics_events(account_id, campaign_id, occurred_at desc)
  where campaign_id is not null;

create index if not exists analytics_events_asset_idx
  on public.analytics_events(account_id, asset_id, occurred_at desc)
  where asset_id is not null;

create unique index if not exists analytics_events_dedupe_unique
  on public.analytics_events(account_id, dedupe_key)
  where dedupe_key is not null;

create table if not exists public.analytics_daily_metrics (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  source_id uuid not null references public.analytics_data_sources(id) on delete cascade,
  metric_date date not null,
  dimension_key text not null default 'account',
  campaign_id uuid references public.campaigns(id) on delete set null,
  asset_id uuid references public.generated_assets(id) on delete set null,
  channel text,
  traffic_source text,
  traffic_medium text,
  users_count bigint not null default 0 check (users_count >= 0),
  sessions_count bigint not null default 0 check (sessions_count >= 0),
  engaged_sessions_count bigint not null default 0 check (engaged_sessions_count >= 0),
  page_views_count bigint not null default 0 check (page_views_count >= 0),
  leads_count bigint not null default 0 check (leads_count >= 0),
  conversions_count bigint not null default 0 check (conversions_count >= 0),
  revenue numeric(14, 2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (account_id, source_id, metric_date, dimension_key)
);

create index if not exists analytics_daily_metrics_account_date_idx
  on public.analytics_daily_metrics(account_id, metric_date desc);

create index if not exists analytics_daily_metrics_campaign_idx
  on public.analytics_daily_metrics(account_id, campaign_id, metric_date desc)
  where campaign_id is not null;

-- Account-scoped RLS. Public collection will use a guarded server endpoint in H1.7B,
-- not direct anonymous table access.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'analytics_data_sources',
    'analytics_goals',
    'analytics_events',
    'analytics_daily_metrics'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);

    execute format('drop policy if exists %I on public.%I', 'Account members can view ' || table_name, table_name);
    execute format(
      'create policy %I on public.%I for select to authenticated using (account_id is not null and public.user_can_view_account(account_id))',
      'Account members can view ' || table_name,
      table_name
    );

    execute format('drop policy if exists %I on public.%I', 'Account managers can insert ' || table_name, table_name);
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (account_id is not null and public.user_can_manage_account(account_id))',
      'Account managers can insert ' || table_name,
      table_name
    );

    execute format('drop policy if exists %I on public.%I', 'Account managers can update ' || table_name, table_name);
    execute format(
      'create policy %I on public.%I for update to authenticated using (account_id is not null and public.user_can_manage_account(account_id)) with check (account_id is not null and public.user_can_manage_account(account_id))',
      'Account managers can update ' || table_name,
      table_name
    );

    execute format('drop policy if exists %I on public.%I', 'Account managers can delete ' || table_name, table_name);
    execute format(
      'create policy %I on public.%I for delete to authenticated using (account_id is not null and public.user_can_manage_account(account_id))',
      'Account managers can delete ' || table_name,
      table_name
    );
  end loop;
end $$;

notify pgrst, 'reload schema';
