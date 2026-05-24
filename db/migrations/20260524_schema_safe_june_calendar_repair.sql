-- Rudys VIP
-- Schema-safe June 2026 calendar repair.
-- This does NOT reference campaigns.title directly because some installs use campaigns.name only.
-- It uses to_jsonb(row)::text to detect June/Week text safely.

-- 1) Ensure required planning fields exist.
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
add column if not exists calendar_notes text;

-- 2) Mark obvious June 2026 campaigns using schema-safe row text search.
update public.campaigns c
set
  campaign_month = '2026-06',
  campaign_week_number = coalesce(
    c.campaign_week_number,
    nullif(substring(to_jsonb(c)::text from 'Week ([0-9]+)'), '')::integer
  )
where (
    to_jsonb(c)::text ilike '%June%'
    and to_jsonb(c)::text ilike '%2026%'
  )
  and (
    c.campaign_month is null
    or c.campaign_month <> '2026-06'
    or c.campaign_week_number is null
  );

-- 3) Fallback for the just-generated monthly campaign batch.
-- If campaigns were created by the monthly calendar generator but do not contain June text,
-- assign recent untagged monthly_campaign_calendar rows to June 2026.
update public.campaigns c
set campaign_month = '2026-06'
where c.campaign_month is null
  and to_jsonb(c)::text ilike '%monthly_campaign_calendar%'
  and coalesce(c.created_at, now()) >= now() - interval '14 days';

-- 4) Assign week numbers to recent June campaign rows that still lack them.
-- This uses creation order per user and cycles 1-5.
with ranked as (
  select
    c.id,
    row_number() over (
      partition by c.user_id
      order by coalesce(c.created_at, now()) asc, c.id asc
    ) as rn
  from public.campaigns c
  where c.campaign_month = '2026-06'
    and c.campaign_week_number is null
)
update public.campaigns c
set campaign_week_number = ((ranked.rn - 1) % 5) + 1
from ranked
where c.id = ranked.id;

-- 5) Set June week start/end dates.
-- June 1, 2026 is a Monday.
update public.campaigns c
set
  campaign_week_start_date = date '2026-06-01' + ((c.campaign_week_number - 1) * 7),
  campaign_week_end_date = date '2026-06-01' + ((c.campaign_week_number - 1) * 7) + 4,
  planned_start_date = coalesce(c.planned_start_date, date '2026-06-01' + ((c.campaign_week_number - 1) * 7)),
  planned_end_date = coalesce(c.planned_end_date, date '2026-06-01' + ((c.campaign_week_number - 1) * 7) + 4)
where c.campaign_month = '2026-06'
  and c.campaign_week_number between 1 and 5;

-- 6) Copy campaign month/week context to generated assets linked to June campaigns.
update public.generated_assets ga
set
  intended_publish_month = '2026-06',
  campaign_week_number = c.campaign_week_number,
  campaign_week_start_date = c.campaign_week_start_date
from public.campaigns c
where ga.campaign_id = c.id
  and ga.user_id = c.user_id
  and c.campaign_month = '2026-06';

-- 7) Also mark recent generated assets as June when they are linked to recent June-ish campaigns
-- or their own row text contains June 2026.
update public.generated_assets ga
set intended_publish_month = '2026-06'
where ga.intended_publish_month is null
  and (
    (to_jsonb(ga)::text ilike '%June%' and to_jsonb(ga)::text ilike '%2026%')
    or (
      ga.created_at >= now() - interval '14 days'
      and exists (
        select 1
        from public.campaigns c
        where c.id = ga.campaign_id
          and c.user_id = ga.user_id
          and c.campaign_month = '2026-06'
      )
    )
  );

-- 8) Assign deterministic calendar sort orders for June campaign assets.
with ranked as (
  select
    ga.id,
    ga.asset_type,
    row_number() over (
      partition by ga.campaign_id, ga.asset_type
      order by ga.created_at asc, ga.id asc
    ) as type_rank
  from public.generated_assets ga
  join public.campaigns c on c.id = ga.campaign_id and c.user_id = ga.user_id
  where c.campaign_month = '2026-06'
)
update public.generated_assets ga
set calendar_sort_order =
  case
    when ranked.asset_type = 'blog_post' then 30
    when ranked.asset_type = 'email' then 80
    when ranked.asset_type = 'video_script' then 110

    when ranked.asset_type = 'linkedin_post' and ranked.type_rank = 1 then 10
    when ranked.asset_type = 'linkedin_post' and ranked.type_rank = 2 then 40
    when ranked.asset_type = 'linkedin_post' and ranked.type_rank = 3 then 60
    when ranked.asset_type = 'linkedin_post' and ranked.type_rank = 4 then 90
    when ranked.asset_type = 'linkedin_post' and ranked.type_rank >= 5 then 120

    when ranked.asset_type = 'facebook_post' and ranked.type_rank = 1 then 20
    when ranked.asset_type = 'facebook_post' and ranked.type_rank = 2 then 50
    when ranked.asset_type = 'facebook_post' and ranked.type_rank = 3 then 70
    when ranked.asset_type = 'facebook_post' and ranked.type_rank = 4 then 100
    when ranked.asset_type = 'facebook_post' and ranked.type_rank >= 5 then 130

    else coalesce(ga.calendar_sort_order, 50)
  end
from ranked
where ga.id = ranked.id;

-- 9) Assign planned publish dates from campaign week start + sort order offset.
update public.generated_assets ga
set planned_publish_date =
  ga.campaign_week_start_date +
  case
    when ga.calendar_sort_order in (10, 20) then 0
    when ga.calendar_sort_order in (30, 40, 50) then 1
    when ga.calendar_sort_order in (60, 70) then 2
    when ga.calendar_sort_order in (80, 90, 100) then 3
    when ga.calendar_sort_order in (110, 120, 130) then 4
    else 0
  end
where ga.intended_publish_month = '2026-06'
  and ga.campaign_week_start_date is not null
  and ga.calendar_sort_order is not null;

-- 10) Assign scheduled publish times from planned dates.
update public.generated_assets ga
set
  scheduled_publish_at = (
    ga.planned_publish_date::timestamp +
    case
      when ga.calendar_sort_order = 10 then time '09:15'
      when ga.calendar_sort_order = 20 then time '11:00'
      when ga.calendar_sort_order = 30 then time '09:00'
      when ga.calendar_sort_order = 40 then time '13:30'
      when ga.calendar_sort_order = 50 then time '15:00'
      when ga.calendar_sort_order = 60 then time '09:15'
      when ga.calendar_sort_order = 70 then time '11:00'
      when ga.calendar_sort_order = 80 then time '09:15'
      when ga.calendar_sort_order = 90 then time '13:30'
      when ga.calendar_sort_order = 100 then time '15:00'
      when ga.calendar_sort_order = 110 then time '10:30'
      when ga.calendar_sort_order = 120 then time '13:00'
      when ga.calendar_sort_order = 130 then time '14:30'
      else time '10:00'
    end
  ) at time zone 'America/Chicago',
  publish_timezone = 'America/Chicago',
  scheduling_status = 'scheduled',
  scheduling_notes = coalesce(
    ga.scheduling_notes,
    'Repaired by schema-safe June campaign calendar repair.'
  )
where ga.intended_publish_month = '2026-06'
  and ga.planned_publish_date is not null;

-- 11) Copy campaign context to content calendar items linked to June campaigns.
update public.content_calendar_items cci
set
  intended_publish_month = '2026-06',
  campaign_week_number = c.campaign_week_number,
  campaign_week_start_date = c.campaign_week_start_date
from public.campaigns c
where cci.campaign_id = c.id
  and cci.user_id = c.user_id
  and c.campaign_month = '2026-06';

-- 12) Refresh API schema cache.
notify pgrst, 'reload schema';
