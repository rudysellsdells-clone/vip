-- Rudys VIP Sprint 2.13
-- Editable content quality thresholds and quality gate decisions.

create extension if not exists "pgcrypto";

create table if not exists public.quality_gate_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  overall_min integer not null default 90,
  brand_voice_min integer not null default 85,
  clarity_min integer not null default 80,
  cta_min integer not null default 85,
  seo_aio_min integer not null default 75,
  conversion_min integer not null default 80,
  approval_mode text not null default 'mark_ready',
  require_human_approval boolean not null default true,
  is_enabled boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint quality_gate_settings_user_unique unique(user_id),
  constraint quality_gate_settings_score_check check (
    overall_min between 0 and 100
    and brand_voice_min between 0 and 100
    and clarity_min between 0 and 100
    and cta_min between 0 and 100
    and seo_aio_min between 0 and 100
    and conversion_min between 0 and 100
  ),
  constraint quality_gate_settings_approval_mode_check check (
    approval_mode in ('mark_ready', 'auto_approve', 'disabled')
  )
);

create table if not exists public.quality_gate_decisions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  asset_id uuid not null references public.generated_assets(id) on delete cascade,
  review_id uuid not null references public.asset_quality_reviews(id) on delete cascade,
  decision text not null,
  passed boolean not null default false,
  reason text,
  settings_snapshot jsonb not null default '{}'::jsonb,
  score_snapshot jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint quality_gate_decisions_decision_check check (
    decision in ('ready_for_publishing', 'auto_approved', 'needs_revision', 'manual_review', 'disabled')
  )
);

drop trigger if exists quality_gate_settings_set_updated_at on public.quality_gate_settings;
create trigger quality_gate_settings_set_updated_at
before update on public.quality_gate_settings
for each row execute function public.set_updated_at();

create index if not exists idx_quality_gate_settings_user_id on public.quality_gate_settings(user_id);
create index if not exists idx_quality_gate_decisions_user_id on public.quality_gate_decisions(user_id);
create index if not exists idx_quality_gate_decisions_asset_id on public.quality_gate_decisions(asset_id);
create index if not exists idx_quality_gate_decisions_review_id on public.quality_gate_decisions(review_id);
create index if not exists idx_quality_gate_decisions_decision on public.quality_gate_decisions(decision);
create index if not exists idx_quality_gate_decisions_created_at on public.quality_gate_decisions(created_at);

alter table public.quality_gate_settings enable row level security;
alter table public.quality_gate_decisions enable row level security;

drop policy if exists "Users can view their own quality gate settings" on public.quality_gate_settings;
create policy "Users can view their own quality gate settings"
on public.quality_gate_settings for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert their own quality gate settings" on public.quality_gate_settings;
create policy "Users can insert their own quality gate settings"
on public.quality_gate_settings for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own quality gate settings" on public.quality_gate_settings;
create policy "Users can update their own quality gate settings"
on public.quality_gate_settings for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can view their own quality gate decisions" on public.quality_gate_decisions;
create policy "Users can view their own quality gate decisions"
on public.quality_gate_decisions for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert their own quality gate decisions" on public.quality_gate_decisions;
create policy "Users can insert their own quality gate decisions"
on public.quality_gate_decisions for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own quality gate decisions" on public.quality_gate_decisions;
create policy "Users can update their own quality gate decisions"
on public.quality_gate_decisions for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
