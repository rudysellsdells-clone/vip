-- Rudys VIP
-- Monthly generator assets-first required fields.
-- Safe to run repeatedly.

alter table public.campaigns
add column if not exists campaign_month text,
add column if not exists campaign_week_number integer,
add column if not exists campaign_week_start_date date,
add column if not exists campaign_week_end_date date,
add column if not exists planned_start_date date,
add column if not exists planned_end_date date,
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

create index if not exists idx_campaigns_user_month
on public.campaigns(user_id, campaign_month);

create index if not exists idx_generated_assets_campaign_calendar
on public.generated_assets(user_id, campaign_id, intended_publish_month, planned_publish_date);

create index if not exists idx_content_calendar_items_campaign_calendar
on public.content_calendar_items(user_id, campaign_id, intended_publish_month, planned_publish_date);

notify pgrst, 'reload schema';
