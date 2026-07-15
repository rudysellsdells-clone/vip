-- H1.7C3 Marketing VIP analytics account-isolation hardening
-- Depends on H1.7A, H1.7B, H1.7C1, and H1.7C2.
-- Enforces one analytics source of each type per account, repairs historical
-- source/account inconsistencies, records duplicate-source merges, and adds
-- database guards that reject future cross-account analytics relationships.

create table if not exists public.analytics_source_merge_log (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  source_type text not null check (source_type in ('native', 'ga4')),
  kept_source_id uuid not null,
  removed_source_id uuid not null,
  details jsonb not null default '{}'::jsonb,
  merged_at timestamptz not null default now(),
  unique (removed_source_id)
);

create index if not exists analytics_source_merge_log_account_idx
  on public.analytics_source_merge_log(account_id, merged_at desc);

alter table public.analytics_source_merge_log enable row level security;

drop policy if exists "Account members can view analytics source merge log"
  on public.analytics_source_merge_log;
create policy "Account members can view analytics source merge log"
on public.analytics_source_merge_log
for select
to authenticated
using (public.user_can_view_account(account_id));

revoke insert, update, delete on table public.analytics_source_merge_log
  from anon, authenticated;
grant select on table public.analytics_source_merge_log to authenticated;

-- Choose one canonical source for every account/source-type pair before the
-- database uniqueness constraint is added. Active, configured, recently synced
-- sources win over incomplete or older rows.
create temp table analytics_source_merge_map on commit drop as
with ranked as (
  select
    source.id,
    source.account_id,
    source.source_type,
    first_value(source.id) over (
      partition by source.account_id, source.source_type
      order by
        case source.status
          when 'active' then 0
          when 'connecting' then 1
          when 'paused' then 2
          when 'draft' then 3
          else 4
        end,
        case
          when source.source_type = 'ga4' and source.external_property_id is not null then 0
          when source.source_type = 'native' and source.collection_key is not null then 0
          else 1
        end,
        source.last_synced_at desc nulls last,
        source.updated_at desc nulls last,
        source.created_at asc,
        source.id asc
    ) as kept_source_id
  from public.analytics_data_sources source
)
select
  id as removed_source_id,
  kept_source_id,
  account_id,
  source_type
from ranked
where id <> kept_source_id;

insert into public.analytics_source_merge_log (
  account_id,
  source_type,
  kept_source_id,
  removed_source_id,
  details
)
select
  merge_map.account_id,
  merge_map.source_type,
  merge_map.kept_source_id,
  merge_map.removed_source_id,
  jsonb_build_object(
    'kept_name', kept.name,
    'kept_property_id', kept.external_property_id,
    'removed_name', removed.name,
    'removed_property_id', removed.external_property_id,
    'migration', 'h1.7c3'
  )
from analytics_source_merge_map merge_map
join public.analytics_data_sources kept
  on kept.id = merge_map.kept_source_id
join public.analytics_data_sources removed
  on removed.id = merge_map.removed_source_id
on conflict (removed_source_id) do nothing;

-- Keep the strongest credential for the canonical GA4 source. Existing
-- credentials on the kept source take precedence, followed by the credential
-- with the latest expiration/update timestamp.
create temp table analytics_credential_resolution on commit drop as
select
  credential.id as credential_id,
  coalesce(merge_map.kept_source_id, credential.source_id) as target_source_id,
  target_source.account_id as target_account_id,
  row_number() over (
    partition by coalesce(merge_map.kept_source_id, credential.source_id), credential.provider
    order by
      case when credential.source_id = coalesce(merge_map.kept_source_id, credential.source_id) then 0 else 1 end,
      credential.expires_at desc nulls last,
      credential.updated_at desc nulls last,
      credential.created_at desc,
      credential.id asc
  ) as credential_rank
from public.analytics_oauth_credentials credential
left join analytics_source_merge_map merge_map
  on merge_map.removed_source_id = credential.source_id
join public.analytics_data_sources target_source
  on target_source.id = coalesce(merge_map.kept_source_id, credential.source_id)
where exists (
  select 1
  from analytics_source_merge_map group_map
  where group_map.removed_source_id = credential.source_id
     or group_map.kept_source_id = credential.source_id
);

delete from public.analytics_oauth_credentials credential
using analytics_credential_resolution resolution
where credential.id = resolution.credential_id
  and resolution.credential_rank > 1;

update public.analytics_oauth_credentials credential
set
  source_id = resolution.target_source_id,
  account_id = resolution.target_account_id,
  updated_at = now()
from analytics_credential_resolution resolution
where credential.id = resolution.credential_id
  and resolution.credential_rank = 1;

-- Preserve one daily metric row for each canonical source/date/dimension key.
-- When duplicate sources contain the same row, prefer the existing canonical
-- row, then the most recently updated duplicate row.
create temp table analytics_metric_resolution on commit drop as
select
  metric.id as metric_id,
  target_source.id as target_source_id,
  target_source.account_id as target_account_id,
  row_number() over (
    partition by
      target_source.id,
      metric.metric_date,
      metric.dimension_key
    order by
      case when metric.source_id = target_source.id then 0 else 1 end,
      metric.updated_at desc nulls last,
      metric.created_at desc,
      metric.id asc
  ) as metric_rank
from public.analytics_daily_metrics metric
left join analytics_source_merge_map merge_map
  on merge_map.removed_source_id = metric.source_id
join public.analytics_data_sources target_source
  on target_source.id = coalesce(merge_map.kept_source_id, metric.source_id)
where exists (
  select 1
  from analytics_source_merge_map group_map
  where group_map.removed_source_id = metric.source_id
     or group_map.kept_source_id = metric.source_id
);

delete from public.analytics_daily_metrics metric
using analytics_metric_resolution resolution
where metric.id = resolution.metric_id
  and resolution.metric_rank > 1;

update public.analytics_daily_metrics metric
set
  source_id = resolution.target_source_id,
  account_id = resolution.target_account_id,
  updated_at = now()
from analytics_metric_resolution resolution
where metric.id = resolution.metric_id
  and resolution.metric_rank = 1;

-- Move non-aggregated history to the canonical source before duplicate source
-- rows are removed.
update public.analytics_events event
set
  source_id = merge_map.kept_source_id,
  account_id = merge_map.account_id
from analytics_source_merge_map merge_map
where event.source_id = merge_map.removed_source_id;

update public.analytics_sync_runs sync_run
set
  source_id = merge_map.kept_source_id,
  account_id = merge_map.account_id
from analytics_source_merge_map merge_map
where sync_run.source_id = merge_map.removed_source_id;

delete from public.analytics_data_sources source
using analytics_source_merge_map merge_map
where source.id = merge_map.removed_source_id;

-- Repair any historical source/account mismatches before future writes are
-- guarded. The source row is authoritative for source-owned analytics data.
update public.analytics_oauth_credentials credential
set
  account_id = source.account_id,
  updated_at = now()
from public.analytics_data_sources source
where credential.source_id = source.id
  and credential.account_id is distinct from source.account_id;

update public.analytics_events event
set account_id = source.account_id
from public.analytics_data_sources source
where event.source_id = source.id
  and event.account_id is distinct from source.account_id;

update public.analytics_daily_metrics metric
set
  account_id = source.account_id,
  updated_at = now()
from public.analytics_data_sources source
where metric.source_id = source.id
  and metric.account_id is distinct from source.account_id;

update public.analytics_sync_runs sync_run
set account_id = source.account_id
from public.analytics_data_sources source
where sync_run.source_id = source.id
  and sync_run.account_id is distinct from source.account_id;

-- Remove stale campaign/asset references that point across accounts. The
-- analytics row remains available under the correct account but becomes
-- unattributed instead of leaking another account's record relationship.
update public.analytics_events event
set campaign_id = null
where event.campaign_id is not null
  and not exists (
    select 1
    from public.campaigns campaign
    where campaign.id = event.campaign_id
      and campaign.account_id = event.account_id
  );

update public.analytics_events event
set asset_id = null
where event.asset_id is not null
  and not exists (
    select 1
    from public.generated_assets asset
    where asset.id = event.asset_id
      and asset.account_id = event.account_id
  );

update public.analytics_daily_metrics metric
set
  campaign_id = null,
  updated_at = now()
where metric.campaign_id is not null
  and not exists (
    select 1
    from public.campaigns campaign
    where campaign.id = metric.campaign_id
      and campaign.account_id = metric.account_id
  );

update public.analytics_daily_metrics metric
set
  asset_id = null,
  updated_at = now()
where metric.asset_id is not null
  and not exists (
    select 1
    from public.generated_assets asset
    where asset.id = metric.asset_id
      and asset.account_id = metric.account_id
  );

-- A tracking link belongs to the asset's account. Align historical rows where
-- a valid account-owned asset exists, then clear cross-account campaign links.
update public.analytics_tracking_links tracking_link
set
  account_id = asset.account_id,
  vip_asset = tracking_link.asset_id,
  updated_at = now()
from public.generated_assets asset
where asset.id = tracking_link.asset_id
  and asset.account_id is not null
  and tracking_link.account_id is distinct from asset.account_id;

update public.analytics_tracking_links tracking_link
set
  campaign_id = null,
  vip_campaign = null,
  updated_at = now()
where tracking_link.campaign_id is not null
  and not exists (
    select 1
    from public.campaigns campaign
    where campaign.id = tracking_link.campaign_id
      and campaign.account_id = tracking_link.account_id
  );

update public.analytics_tracking_links tracking_link
set
  vip_campaign = tracking_link.campaign_id,
  vip_asset = tracking_link.asset_id,
  updated_at = now()
where tracking_link.vip_campaign is distinct from tracking_link.campaign_id
   or tracking_link.vip_asset is distinct from tracking_link.asset_id;

-- Publishing execution attribution follows the asset account. Repair legacy
-- null/mismatched account IDs, then clear any campaign or tracking-link
-- relationship that belongs to another account.
update public.publishing_execution_runs execution_run
set account_id = asset.account_id
from public.generated_assets asset
where asset.id = execution_run.asset_id
  and asset.account_id is not null
  and execution_run.account_id is distinct from asset.account_id;

update public.publishing_execution_runs execution_run
set campaign_id = null
where execution_run.campaign_id is not null
  and execution_run.account_id is not null
  and not exists (
    select 1
    from public.campaigns campaign
    where campaign.id = execution_run.campaign_id
      and campaign.account_id = execution_run.account_id
  );

update public.publishing_execution_runs execution_run
set
  tracking_link_id = null,
  destination_url = null,
  tracked_url = null,
  attribution = '{}'::jsonb
where execution_run.tracking_link_id is not null
  and execution_run.account_id is not null
  and not exists (
    select 1
    from public.analytics_tracking_links tracking_link
    where tracking_link.id = execution_run.tracking_link_id
      and tracking_link.account_id = execution_run.account_id
  );

-- Database-level one-source-per-account rule. This is the core guarantee that
-- each Marketing VIP account has no more than one native source and one GA4
-- connection row.
create unique index if not exists analytics_data_sources_account_source_type_key
  on public.analytics_data_sources(account_id, source_type);

-- Reject any future child record whose source belongs to a different account.
create or replace function public.analytics_assert_source_account()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  source_account_id uuid;
  source_kind text;
  provider_name text;
begin
  if new.source_id is null then
    return new;
  end if;

  select source.account_id, source.source_type
  into source_account_id, source_kind
  from public.analytics_data_sources source
  where source.id = new.source_id;

  if source_account_id is null then
    raise exception 'Analytics source % does not exist.', new.source_id
      using errcode = '23503';
  end if;

  if new.account_id is distinct from source_account_id then
    raise exception 'Analytics source % belongs to a different Marketing VIP account.', new.source_id
      using errcode = '23514';
  end if;

  provider_name := nullif(to_jsonb(new) ->> 'provider', '');
  if provider_name = 'ga4' and source_kind <> 'ga4' then
    raise exception 'GA4 credentials must reference a GA4 analytics source.'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

-- Reject campaign and asset relationships that do not belong to the analytics
-- row's account. All attached tables contain account_id, campaign_id, asset_id.
create or replace function public.analytics_assert_campaign_asset_account()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  campaign_account_id uuid;
  asset_account_id uuid;
begin
  if new.account_id is null then
    return new;
  end if;

  if new.campaign_id is not null then
    select campaign.account_id
    into campaign_account_id
    from public.campaigns campaign
    where campaign.id = new.campaign_id;

    if campaign_account_id is null then
      raise exception 'Campaign % is not assigned to a Marketing VIP account.', new.campaign_id
        using errcode = '23514';
    end if;

    if campaign_account_id is distinct from new.account_id then
      raise exception 'Campaign % belongs to a different Marketing VIP account.', new.campaign_id
        using errcode = '23514';
    end if;
  end if;

  if new.asset_id is not null then
    select asset.account_id
    into asset_account_id
    from public.generated_assets asset
    where asset.id = new.asset_id;

    if asset_account_id is null then
      raise exception 'Asset % is not assigned to a Marketing VIP account.', new.asset_id
        using errcode = '23514';
    end if;

    if asset_account_id is distinct from new.account_id then
      raise exception 'Asset % belongs to a different Marketing VIP account.', new.asset_id
        using errcode = '23514';
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.analytics_assert_tracking_link_account()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  tracking_account_id uuid;
begin
  if new.tracking_link_id is null or new.account_id is null then
    return new;
  end if;

  select tracking_link.account_id
  into tracking_account_id
  from public.analytics_tracking_links tracking_link
  where tracking_link.id = new.tracking_link_id;

  if tracking_account_id is null then
    raise exception 'Analytics tracking link % does not exist.', new.tracking_link_id
      using errcode = '23503';
  end if;

  if tracking_account_id is distinct from new.account_id then
    raise exception 'Analytics tracking link % belongs to a different Marketing VIP account.', new.tracking_link_id
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create or replace function public.analytics_prevent_source_account_move()
returns trigger
language plpgsql
security invoker
as $$
begin
  if new.account_id is distinct from old.account_id then
    raise exception 'Analytics sources cannot be moved between Marketing VIP accounts.'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

-- Child/source consistency triggers.
drop trigger if exists analytics_oauth_credentials_account_guard
  on public.analytics_oauth_credentials;
create trigger analytics_oauth_credentials_account_guard
before insert or update of account_id, source_id, provider
on public.analytics_oauth_credentials
for each row execute function public.analytics_assert_source_account();

drop trigger if exists analytics_events_source_account_guard
  on public.analytics_events;
create trigger analytics_events_source_account_guard
before insert or update of account_id, source_id
on public.analytics_events
for each row execute function public.analytics_assert_source_account();

drop trigger if exists analytics_daily_metrics_source_account_guard
  on public.analytics_daily_metrics;
create trigger analytics_daily_metrics_source_account_guard
before insert or update of account_id, source_id
on public.analytics_daily_metrics
for each row execute function public.analytics_assert_source_account();

drop trigger if exists analytics_sync_runs_source_account_guard
  on public.analytics_sync_runs;
create trigger analytics_sync_runs_source_account_guard
before insert or update of account_id, source_id
on public.analytics_sync_runs
for each row execute function public.analytics_assert_source_account();

-- Campaign/asset consistency triggers.
drop trigger if exists analytics_events_attribution_account_guard
  on public.analytics_events;
create trigger analytics_events_attribution_account_guard
before insert or update of account_id, campaign_id, asset_id
on public.analytics_events
for each row execute function public.analytics_assert_campaign_asset_account();

drop trigger if exists analytics_daily_metrics_attribution_account_guard
  on public.analytics_daily_metrics;
create trigger analytics_daily_metrics_attribution_account_guard
before insert or update of account_id, campaign_id, asset_id
on public.analytics_daily_metrics
for each row execute function public.analytics_assert_campaign_asset_account();

drop trigger if exists analytics_tracking_links_attribution_account_guard
  on public.analytics_tracking_links;
create trigger analytics_tracking_links_attribution_account_guard
before insert or update of account_id, campaign_id, asset_id
on public.analytics_tracking_links
for each row execute function public.analytics_assert_campaign_asset_account();

drop trigger if exists publishing_execution_runs_attribution_account_guard
  on public.publishing_execution_runs;
create trigger publishing_execution_runs_attribution_account_guard
before insert or update of account_id, campaign_id, asset_id
on public.publishing_execution_runs
for each row execute function public.analytics_assert_campaign_asset_account();

drop trigger if exists publishing_execution_runs_tracking_account_guard
  on public.publishing_execution_runs;
create trigger publishing_execution_runs_tracking_account_guard
before insert or update of account_id, tracking_link_id
on public.publishing_execution_runs
for each row execute function public.analytics_assert_tracking_link_account();

drop trigger if exists analytics_data_sources_account_immutable
  on public.analytics_data_sources;
create trigger analytics_data_sources_account_immutable
before update of account_id
on public.analytics_data_sources
for each row execute function public.analytics_prevent_source_account_move();

-- Keep the mirror identifiers in tracking links exact and auditable.
alter table public.analytics_tracking_links
  drop constraint if exists analytics_tracking_links_vip_asset_matches_asset;
alter table public.analytics_tracking_links
  add constraint analytics_tracking_links_vip_asset_matches_asset
  check (vip_asset = asset_id) not valid;
alter table public.analytics_tracking_links
  validate constraint analytics_tracking_links_vip_asset_matches_asset;

alter table public.analytics_tracking_links
  drop constraint if exists analytics_tracking_links_vip_campaign_matches_campaign;
alter table public.analytics_tracking_links
  add constraint analytics_tracking_links_vip_campaign_matches_campaign
  check (vip_campaign is not distinct from campaign_id) not valid;
alter table public.analytics_tracking_links
  validate constraint analytics_tracking_links_vip_campaign_matches_campaign;

notify pgrst, 'reload schema';
