-- Rudys VIP Luma 20-second YouTube video lane
-- Creates a provider-specific run table for campaign-level YouTube-ready videos.

create extension if not exists "pgcrypto";

create table if not exists public.luma_video_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  campaign_id uuid references public.campaigns(id) on delete cascade,
  status text not null default 'draft',
  target_seconds integer not null default 20,
  scene_count integer not null default 4,
  current_scene_index integer not null default 0,
  model text not null default 'ray-2',
  resolution text not null default '720p',
  aspect_ratio text not null default '16:9',
  scene_plan jsonb not null default '[]'::jsonb,
  generations jsonb not null default '[]'::jsonb,
  final_video_url text,
  error text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint luma_video_runs_status_check check (
    status in (
      'draft',
      'generating_scene_1',
      'generating_scene_2',
      'generating_scene_3',
      'generating_scene_4',
      'completed',
      'failed',
      'cancelled'
    )
  )
);

drop trigger if exists luma_video_runs_set_updated_at on public.luma_video_runs;
create trigger luma_video_runs_set_updated_at
before update on public.luma_video_runs
for each row execute function public.set_updated_at();

create index if not exists idx_luma_video_runs_user_id on public.luma_video_runs(user_id);
create index if not exists idx_luma_video_runs_campaign_id on public.luma_video_runs(campaign_id);
create index if not exists idx_luma_video_runs_status on public.luma_video_runs(status);

alter table public.luma_video_runs enable row level security;

drop policy if exists "Users can view their own luma video runs" on public.luma_video_runs;
create policy "Users can view their own luma video runs"
on public.luma_video_runs for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert their own luma video runs" on public.luma_video_runs;
create policy "Users can insert their own luma video runs"
on public.luma_video_runs for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own luma video runs" on public.luma_video_runs;
create policy "Users can update their own luma video runs"
on public.luma_video_runs for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own luma video runs" on public.luma_video_runs;
create policy "Users can delete their own luma video runs"
on public.luma_video_runs for delete
to authenticated
using ((select auth.uid()) = user_id);
