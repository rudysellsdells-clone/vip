-- Rudys VIP Strategic Content Calendar Foundation
-- Adds monthly planning and calendar item tables for Phase Two.

create extension if not exists "pgcrypto";

create table if not exists public.content_calendar_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  plan_month date not null,
  month_label text not null,
  monthly_theme text not null,
  business_goal text,
  target_audience text,
  offer_focus text,
  status text not null default 'planned',
  weekly_campaigns jsonb not null default '[]'::jsonb,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint content_calendar_plans_status_check check (
    status in ('planned', 'active', 'completed', 'archived')
  )
);

drop trigger if exists content_calendar_plans_set_updated_at on public.content_calendar_plans;
create trigger content_calendar_plans_set_updated_at
before update on public.content_calendar_plans
for each row execute function public.set_updated_at();

create table if not exists public.content_calendar_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  plan_id uuid not null references public.content_calendar_plans(id) on delete cascade,
  campaign_id uuid references public.campaigns(id) on delete set null,
  scheduled_date date not null,
  week_number integer not null default 1,
  title text not null,
  description text,
  item_type text not null,
  platform text,
  status text not null default 'planned',
  content_angle text,
  cta text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint content_calendar_items_status_check check (
    status in ('planned', 'generated', 'needs_review', 'approved', 'scheduled', 'published', 'skipped')
  ),
  constraint content_calendar_items_type_check check (
    item_type in (
      'weekly_campaign',
      'blog_post',
      'facebook_post',
      'linkedin_post',
      'email_outreach',
      'video_concept',
      'what_if_story',
      'white_paper',
      'authority_asset',
      'other'
    )
  )
);

drop trigger if exists content_calendar_items_set_updated_at on public.content_calendar_items;
create trigger content_calendar_items_set_updated_at
before update on public.content_calendar_items
for each row execute function public.set_updated_at();

create index if not exists idx_content_calendar_plans_user_id on public.content_calendar_plans(user_id);
create index if not exists idx_content_calendar_plans_plan_month on public.content_calendar_plans(plan_month);
create index if not exists idx_content_calendar_plans_status on public.content_calendar_plans(status);

create index if not exists idx_content_calendar_items_user_id on public.content_calendar_items(user_id);
create index if not exists idx_content_calendar_items_plan_id on public.content_calendar_items(plan_id);
create index if not exists idx_content_calendar_items_scheduled_date on public.content_calendar_items(scheduled_date);
create index if not exists idx_content_calendar_items_status on public.content_calendar_items(status);
create index if not exists idx_content_calendar_items_type on public.content_calendar_items(item_type);

alter table public.content_calendar_plans enable row level security;
alter table public.content_calendar_items enable row level security;

drop policy if exists "Users can view their own content calendar plans" on public.content_calendar_plans;
create policy "Users can view their own content calendar plans"
on public.content_calendar_plans for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert their own content calendar plans" on public.content_calendar_plans;
create policy "Users can insert their own content calendar plans"
on public.content_calendar_plans for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own content calendar plans" on public.content_calendar_plans;
create policy "Users can update their own content calendar plans"
on public.content_calendar_plans for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own content calendar plans" on public.content_calendar_plans;
create policy "Users can delete their own content calendar plans"
on public.content_calendar_plans for delete
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can view their own content calendar items" on public.content_calendar_items;
create policy "Users can view their own content calendar items"
on public.content_calendar_items for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert their own content calendar items" on public.content_calendar_items;
create policy "Users can insert their own content calendar items"
on public.content_calendar_items for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own content calendar items" on public.content_calendar_items;
create policy "Users can update their own content calendar items"
on public.content_calendar_items for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own content calendar items" on public.content_calendar_items;
create policy "Users can delete their own content calendar items"
on public.content_calendar_items for delete
to authenticated
using ((select auth.uid()) = user_id);
