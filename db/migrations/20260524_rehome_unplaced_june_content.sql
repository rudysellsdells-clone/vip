-- Rudys VIP
-- Rehome unplaced June 2026 planned/generated content.
-- Use this when records exist but do not appear on June because they have no intended month/date fields.

-- 1) Ensure fields exist.
alter table public.campaigns
add column if not exists campaign_month text,
add column if not exists campaign_week_number integer,
add column if not exists campaign_week_start_date date,
add column if not exists campaign_week_end_date date,
add column if not exists planned_start_date date,
add column if not exists planned_end_date date,
add column if not exists calendar_notes text,
add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.generated_assets
add column if not exists intended_publish_month text,
add column if not exists planned_publish_date date,
add column if not exists campaign_week_number integer,
add column if not exists campaign_week_start_date date,
add column if not exists calendar_sort_order integer,
add column if not exists calendar_notes text,
add column if not exists scheduled_publish_at timestamptz,
add column if not exists publish_timezone text not null default 'America/Chicago',
add column if not exists scheduling_status text not null default 'unscheduled',
add column if not exists scheduling_notes text;

alter table public.content_calendar_items
add column if not exists intended_publish_month text,
add column if not exists planned_publish_date date,
add column if not exists campaign_id uuid,
add column if not exists campaign_week_number integer,
add column if not exists campaign_week_start_date date,
add column if not exists calendar_sort_order integer,
add column if not exists calendar_notes text,
add column if not exists scheduled_publish_at timestamptz,
add column if not exists publish_timezone text not null default 'America/Chicago',
add column if not exists scheduling_status text not null default 'unscheduled',
add column if not exists scheduling_notes text;

-- 2) Rehome unplaced planned items to June 2026.
-- Targets records that are loaded by the calendar but have no actual calendar placement.
-- Limited to recent records OR rows that mention June/2026 to avoid touching older historical content.
with candidates as (
  select
    cci.id,
    cci.user_id,
    row_number() over (
      partition by cci.user_id
      order by coalesce(cci.created_at, now()) asc, cci.id asc
    ) as rn
  from public.content_calendar_items cci
  where (
      cci.intended_publish_month is null
      or cci.intended_publish_month = ''
    )
    and cci.planned_publish_date is null
    and cci.scheduled_publish_at is null
    and (
      coalesce(to_jsonb(cci)->>'target_publish_at', '') = ''
      and coalesce(to_jsonb(cci)->>'publish_at', '') = ''
      and coalesce(to_jsonb(cci)->>'planned_date', '') = ''
    )
    and (
      coalesce(cci.created_at, now()) >= now() - interval '14 days'
      or (to_jsonb(cci)::text ilike '%June%' and to_jsonb(cci)::text ilike '%2026%')
      or to_jsonb(cci)::text ilike '%2026-06%'
    )
),
planned as (
  select
    id,
    user_id,
    rn,
    least(5, ((rn - 1) / 21)::integer + 1) as week_number,
    ((rn - 1) % 21) as within_week_index,
    (((rn - 1) % 21) * 5 / 21)::integer as day_offset,
    (((rn - 1) % 4) * 2) as hour_offset
  from candidates
)
update public.content_calendar_items cci
set
  intended_publish_month = '2026-06',
  campaign_week_number = planned.week_number,
  campaign_week_start_date = date '2026-06-01' + ((planned.week_number - 1) * 7),
  planned_publish_date = date '2026-06-01' + ((planned.week_number - 1) * 7) + planned.day_offset,
  calendar_sort_order = coalesce(cci.calendar_sort_order, (planned.within_week_index + 1) * 10),
  scheduled_publish_at = (
    (
      date '2026-06-01'
      + ((planned.week_number - 1) * 7)
      + planned.day_offset
    )::timestamp
    + time '09:00'
    + (planned.hour_offset * interval '1 hour')
  ) at time zone 'America/Chicago',
  publish_timezone = 'America/Chicago',
  scheduling_status = 'scheduled',
  scheduling_notes = coalesce(
    cci.scheduling_notes,
    'Rehomed to June 2026 because this planned item had no calendar placement.'
  ),
  calendar_notes = coalesce(
    cci.calendar_notes,
    'Rehomed to June 2026 by calendar visibility repair.'
  )
from planned
where cci.id = planned.id;

-- 3) Rehome recent unplaced generated assets to June 2026.
with candidates as (
  select
    ga.id,
    ga.user_id,
    row_number() over (
      partition by ga.user_id
      order by coalesce(ga.created_at, now()) asc, ga.id asc
    ) as rn,
    coalesce(to_jsonb(ga)->>'asset_type', 'asset') as asset_type
  from public.generated_assets ga
  where (
      ga.intended_publish_month is null
      or ga.intended_publish_month = ''
    )
    and ga.planned_publish_date is null
    and ga.scheduled_publish_at is null
    and (
      coalesce(ga.created_at, now()) >= now() - interval '14 days'
      or (to_jsonb(ga)::text ilike '%June%' and to_jsonb(ga)::text ilike '%2026%')
      or to_jsonb(ga)::text ilike '%2026-06%'
    )
),
planned as (
  select
    id,
    user_id,
    rn,
    least(5, ((rn - 1) / 13)::integer + 1) as week_number,
    ((rn - 1) % 13) as within_week_index,
    case
      when ((rn - 1) % 13) in (0, 1) then 0
      when ((rn - 1) % 13) in (2, 3, 4) then 1
      when ((rn - 1) % 13) in (5, 6) then 2
      when ((rn - 1) % 13) in (7, 8, 9) then 3
      else 4
    end as day_offset
  from candidates
)
update public.generated_assets ga
set
  intended_publish_month = '2026-06',
  campaign_week_number = planned.week_number,
  campaign_week_start_date = date '2026-06-01' + ((planned.week_number - 1) * 7),
  planned_publish_date = date '2026-06-01' + ((planned.week_number - 1) * 7) + planned.day_offset,
  calendar_sort_order = coalesce(ga.calendar_sort_order, (planned.within_week_index + 1) * 10),
  scheduled_publish_at = (
    (
      date '2026-06-01'
      + ((planned.week_number - 1) * 7)
      + planned.day_offset
    )::timestamp
    + time '10:00'
    + (((planned.within_week_index % 3) * 2) * interval '1 hour')
  ) at time zone 'America/Chicago',
  publish_timezone = 'America/Chicago',
  scheduling_status = 'scheduled',
  scheduling_notes = coalesce(
    ga.scheduling_notes,
    'Rehomed to June 2026 because this generated asset had no calendar placement.'
  ),
  calendar_notes = coalesce(
    ga.calendar_notes,
    'Rehomed to June 2026 by calendar visibility repair.'
  )
from planned
where ga.id = planned.id;

-- 4) Re-copy campaign context where campaigns exist.
update public.generated_assets ga
set
  intended_publish_month = coalesce(ga.intended_publish_month, c.campaign_month),
  campaign_week_number = coalesce(ga.campaign_week_number, c.campaign_week_number),
  campaign_week_start_date = coalesce(ga.campaign_week_start_date, c.campaign_week_start_date)
from public.campaigns c
where ga.campaign_id = c.id
  and ga.user_id = c.user_id
  and c.campaign_month is not null
  and (
    ga.intended_publish_month is null
    or ga.campaign_week_number is null
    or ga.campaign_week_start_date is null
  );

update public.content_calendar_items cci
set
  intended_publish_month = coalesce(cci.intended_publish_month, c.campaign_month),
  campaign_week_number = coalesce(cci.campaign_week_number, c.campaign_week_number),
  campaign_week_start_date = coalesce(cci.campaign_week_start_date, c.campaign_week_start_date)
from public.campaigns c
where cci.campaign_id = c.id
  and cci.user_id = c.user_id
  and c.campaign_month is not null
  and (
    cci.intended_publish_month is null
    or cci.campaign_week_number is null
    or cci.campaign_week_start_date is null
  );

notify pgrst, 'reload schema';

-- 5) Quick verification result.
select
  'content_calendar_items_june' as record_type,
  count(*) as count
from public.content_calendar_items
where intended_publish_month = '2026-06'
union all
select
  'generated_assets_june' as record_type,
  count(*) as count
from public.generated_assets
where intended_publish_month = '2026-06';
