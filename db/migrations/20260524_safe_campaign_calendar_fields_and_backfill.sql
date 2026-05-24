-- Rudys VIP
-- Safe campaign-aware calendar fields + backfill
-- Use this if the backfill failed because intended_publish_month or other calendar fields do not exist yet.

-- 1) Add missing campaign planning fields.
alter table public.campaigns
add column if not exists campaign_month text,
add column if not exists campaign_week_number integer,
add column if not exists campaign_week_start_date date,
add column if not exists campaign_week_end_date date,
add column if not exists planned_start_date date,
add column if not exists planned_end_date date,
add column if not exists calendar_notes text,
add column if not exists metadata jsonb not null default '{}'::jsonb;

-- 2) Add missing generated asset calendar fields.
alter table public.generated_assets
add column if not exists intended_publish_month text,
add column if not exists planned_publish_date date,
add column if not exists campaign_week_number integer,
add column if not exists campaign_week_start_date date,
add column if not exists calendar_sort_order integer,
add column if not exists calendar_notes text;

-- 3) Add missing content calendar item fields.
alter table public.content_calendar_items
add column if not exists intended_publish_month text,
add column if not exists planned_publish_date date,
add column if not exists campaign_id uuid,
add column if not exists campaign_week_number integer,
add column if not exists campaign_week_start_date date,
add column if not exists calendar_sort_order integer,
add column if not exists calendar_notes text;

-- 4) Add indexes safely.
create index if not exists idx_campaigns_campaign_month
on public.campaigns(campaign_month);

create index if not exists idx_campaigns_week
on public.campaigns(campaign_month, campaign_week_number);

create index if not exists idx_campaigns_user_month
on public.campaigns(user_id, campaign_month);

create index if not exists idx_generated_assets_intended_publish_month
on public.generated_assets(intended_publish_month);

create index if not exists idx_generated_assets_planned_publish_date
on public.generated_assets(planned_publish_date);

create index if not exists idx_generated_assets_campaign_calendar
on public.generated_assets(user_id, campaign_id, intended_publish_month, planned_publish_date);

create index if not exists idx_content_calendar_items_intended_publish_month
on public.content_calendar_items(intended_publish_month);

create index if not exists idx_content_calendar_items_planned_publish_date
on public.content_calendar_items(planned_publish_date);

create index if not exists idx_content_calendar_items_campaign_calendar
on public.content_calendar_items(user_id, campaign_id, intended_publish_month, planned_publish_date);

-- 5) Backfill generated assets from campaigns where campaign context exists.
update public.generated_assets ga
set
  intended_publish_month = coalesce(ga.intended_publish_month, c.campaign_month),
  campaign_week_number = coalesce(ga.campaign_week_number, c.campaign_week_number),
  campaign_week_start_date = coalesce(ga.campaign_week_start_date, c.campaign_week_start_date)
from public.campaigns c
where ga.campaign_id = c.id
  and ga.user_id = c.user_id
  and (
    ga.intended_publish_month is null
    or ga.campaign_week_number is null
    or ga.campaign_week_start_date is null
  );

-- 6) Backfill generated asset planned date/month from scheduled publish time.
update public.generated_assets
set
  planned_publish_date = coalesce(planned_publish_date, scheduled_publish_at::date),
  intended_publish_month = coalesce(intended_publish_month, to_char(scheduled_publish_at, 'YYYY-MM'))
where scheduled_publish_at is not null
  and (planned_publish_date is null or intended_publish_month is null);

-- 7) Backfill content calendar items from campaigns where campaign context exists.
update public.content_calendar_items cci
set
  intended_publish_month = coalesce(cci.intended_publish_month, c.campaign_month),
  campaign_week_number = coalesce(cci.campaign_week_number, c.campaign_week_number),
  campaign_week_start_date = coalesce(cci.campaign_week_start_date, c.campaign_week_start_date)
from public.campaigns c
where cci.campaign_id = c.id
  and cci.user_id = c.user_id
  and (
    cci.intended_publish_month is null
    or cci.campaign_week_number is null
    or cci.campaign_week_start_date is null
  );

-- 8) Backfill calendar item planned date/month from scheduled publish time.
update public.content_calendar_items
set
  planned_publish_date = coalesce(planned_publish_date, scheduled_publish_at::date),
  intended_publish_month = coalesce(intended_publish_month, to_char(scheduled_publish_at, 'YYYY-MM'))
where scheduled_publish_at is not null
  and (planned_publish_date is null or intended_publish_month is null);

-- 9) Refresh Supabase/PostgREST schema cache.
notify pgrst, 'reload schema';
