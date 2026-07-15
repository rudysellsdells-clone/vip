-- H1.7B Marketing VIP analytics collection and GA4 connection
-- Depends on 20260715_h1_7a_analytics_foundation.sql.
-- Adds public site identifiers, protected OAuth credential storage,
-- and native event rollup processing.

alter table public.analytics_data_sources
  add column if not exists collection_key text,
  add column if not exists key_rotated_at timestamptz;

create unique index if not exists analytics_data_sources_collection_key_unique
  on public.analytics_data_sources(collection_key)
  where collection_key is not null;

create table if not exists public.analytics_oauth_credentials (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  source_id uuid not null references public.analytics_data_sources(id) on delete cascade,
  provider text not null check (provider in ('ga4')),
  access_token_encrypted text,
  refresh_token_encrypted text,
  token_type text,
  scope text,
  expires_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_id, provider)
);

create index if not exists analytics_oauth_credentials_account_idx
  on public.analytics_oauth_credentials(account_id, provider);

alter table public.analytics_oauth_credentials enable row level security;

-- OAuth credentials are server-only. They are intentionally not readable or writable
-- by anon/authenticated clients, including account managers.
revoke all on table public.analytics_oauth_credentials from anon, authenticated;

create or replace function public.rollup_native_analytics(
  start_date date,
  end_date date,
  target_account_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count bigint := 0;
  inserted_count bigint := 0;
begin
  if start_date is null or end_date is null then
    raise exception 'start_date and end_date are required';
  end if;

  if end_date < start_date then
    raise exception 'end_date must be on or after start_date';
  end if;

  if end_date - start_date > 62 then
    raise exception 'native analytics rollup range cannot exceed 63 days';
  end if;

  delete from public.analytics_daily_metrics m
  using public.analytics_data_sources s
  where m.source_id = s.id
    and s.source_type = 'native'
    and m.metric_date between start_date and end_date
    and (target_account_id is null or m.account_id = target_account_id);

  get diagnostics deleted_count = row_count;

  insert into public.analytics_daily_metrics (
    account_id,
    source_id,
    metric_date,
    dimension_key,
    campaign_id,
    asset_id,
    channel,
    traffic_source,
    traffic_medium,
    users_count,
    sessions_count,
    engaged_sessions_count,
    page_views_count,
    leads_count,
    conversions_count,
    revenue,
    updated_at
  )
  select
    e.account_id,
    e.source_id,
    timezone(s.reporting_timezone, e.occurred_at)::date as metric_date,
    concat_ws(
      '|',
      'native',
      coalesce(nullif(e.channel, ''), 'Unattributed'),
      coalesce(nullif(e.traffic_source, ''), '(direct)'),
      coalesce(nullif(e.traffic_medium, ''), '(none)'),
      coalesce(e.campaign_id::text, 'none'),
      coalesce(e.asset_id::text, 'none')
    ) as dimension_key,
    e.campaign_id,
    e.asset_id,
    coalesce(nullif(e.channel, ''), 'Unattributed') as channel,
    coalesce(nullif(e.traffic_source, ''), '(direct)') as traffic_source,
    coalesce(nullif(e.traffic_medium, ''), '(none)') as traffic_medium,
    count(distinct coalesce(nullif(e.visitor_id, ''), e.id::text)) as users_count,
    count(distinct coalesce(nullif(e.session_id, ''), e.id::text)) as sessions_count,
    count(distinct coalesce(nullif(e.session_id, ''), e.id::text))
      filter (where e.event_name = 'engaged_visit') as engaged_sessions_count,
    count(*) filter (where e.event_name = 'page_view') as page_views_count,
    count(*) filter (
      where e.event_name in (
        'phone_click',
        'email_click',
        'form_submit',
        'lead_created',
        'consultation_scheduled'
      )
    ) as leads_count,
    count(*) filter (
      where e.event_name in (
        'consultation_scheduled',
        'conversion_recorded',
        'purchase'
      )
    ) as conversions_count,
    coalesce(sum(e.value) filter (
      where e.event_name in ('conversion_recorded', 'purchase', 'revenue_recorded')
    ), 0) as revenue,
    now()
  from public.analytics_events e
  join public.analytics_data_sources s on s.id = e.source_id
  where s.source_type = 'native'
    and e.source_id is not null
    and timezone(s.reporting_timezone, e.occurred_at)::date between start_date and end_date
    and (target_account_id is null or e.account_id = target_account_id)
  group by
    e.account_id,
    e.source_id,
    timezone(s.reporting_timezone, e.occurred_at)::date,
    e.campaign_id,
    e.asset_id,
    coalesce(nullif(e.channel, ''), 'Unattributed'),
    coalesce(nullif(e.traffic_source, ''), '(direct)'),
    coalesce(nullif(e.traffic_medium, ''), '(none)');

  get diagnostics inserted_count = row_count;

  update public.analytics_data_sources
  set
    last_synced_at = now(),
    last_error = null,
    updated_at = now()
  where source_type = 'native'
    and (target_account_id is null or account_id = target_account_id);

  return jsonb_build_object(
    'start_date', start_date,
    'end_date', end_date,
    'account_id', target_account_id,
    'deleted_rows', deleted_count,
    'inserted_rows', inserted_count
  );
end;
$$;

revoke all on function public.rollup_native_analytics(date, date, uuid) from public, anon, authenticated;
grant execute on function public.rollup_native_analytics(date, date, uuid) to service_role;

notify pgrst, 'reload schema';
