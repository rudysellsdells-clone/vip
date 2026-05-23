-- Rudys VIP Sprint 2.16
-- Publishing Schedule Layer
-- Adds publish date/time fields so monthly content is staggered instead of released all at once.

alter table public.generated_assets
add column if not exists scheduled_publish_at timestamptz,
add column if not exists publish_timezone text not null default 'America/Chicago',
add column if not exists scheduling_status text not null default 'unscheduled',
add column if not exists scheduling_notes text;

alter table public.content_calendar_items
add column if not exists scheduled_publish_at timestamptz,
add column if not exists publish_timezone text not null default 'America/Chicago',
add column if not exists scheduling_status text not null default 'unscheduled',
add column if not exists scheduling_notes text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'generated_assets_scheduling_status_check'
  ) then
    alter table public.generated_assets
    add constraint generated_assets_scheduling_status_check check (
      scheduling_status in ('unscheduled', 'scheduled', 'published', 'skipped')
    );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'content_calendar_items_scheduling_status_check'
  ) then
    alter table public.content_calendar_items
    add constraint content_calendar_items_scheduling_status_check check (
      scheduling_status in ('unscheduled', 'scheduled', 'published', 'skipped')
    );
  end if;
end $$;

create index if not exists idx_generated_assets_scheduled_publish_at on public.generated_assets(scheduled_publish_at);
create index if not exists idx_generated_assets_scheduling_status on public.generated_assets(scheduling_status);
create index if not exists idx_generated_assets_user_schedule on public.generated_assets(user_id, scheduling_status, scheduled_publish_at);

create index if not exists idx_content_calendar_items_scheduled_publish_at on public.content_calendar_items(scheduled_publish_at);
create index if not exists idx_content_calendar_items_scheduling_status on public.content_calendar_items(scheduling_status);
create index if not exists idx_content_calendar_items_user_schedule on public.content_calendar_items(user_id, scheduling_status, scheduled_publish_at);
