-- Rudys VIP Sprint 2.11
-- Content Quality + Brand Intelligence
-- Stores AI review scores and improvement notes for generated assets.

create extension if not exists "pgcrypto";

create table if not exists public.asset_quality_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  asset_id uuid not null references public.generated_assets(id) on delete cascade,
  overall_score integer not null default 0,
  brand_voice_score integer not null default 0,
  clarity_score integer not null default 0,
  cta_score integer not null default 0,
  seo_aio_score integer not null default 0,
  conversion_score integer not null default 0,
  status text not null default 'reviewed',
  summary text,
  strengths jsonb not null default '[]'::jsonb,
  improvements jsonb not null default '[]'::jsonb,
  suggested_revision text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint asset_quality_reviews_status_check check (
    status in ('reviewed', 'needs_revision', 'strong', 'failed')
  ),
  constraint asset_quality_reviews_score_check check (
    overall_score between 0 and 100
    and brand_voice_score between 0 and 100
    and clarity_score between 0 and 100
    and cta_score between 0 and 100
    and seo_aio_score between 0 and 100
    and conversion_score between 0 and 100
  )
);

drop trigger if exists asset_quality_reviews_set_updated_at on public.asset_quality_reviews;
create trigger asset_quality_reviews_set_updated_at
before update on public.asset_quality_reviews
for each row execute function public.set_updated_at();

create index if not exists idx_asset_quality_reviews_user_id on public.asset_quality_reviews(user_id);
create index if not exists idx_asset_quality_reviews_asset_id on public.asset_quality_reviews(asset_id);
create index if not exists idx_asset_quality_reviews_overall_score on public.asset_quality_reviews(overall_score);
create index if not exists idx_asset_quality_reviews_status on public.asset_quality_reviews(status);
create index if not exists idx_asset_quality_reviews_created_at on public.asset_quality_reviews(created_at);

alter table public.asset_quality_reviews enable row level security;

drop policy if exists "Users can view their own asset quality reviews" on public.asset_quality_reviews;
create policy "Users can view their own asset quality reviews"
on public.asset_quality_reviews for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert their own asset quality reviews" on public.asset_quality_reviews;
create policy "Users can insert their own asset quality reviews"
on public.asset_quality_reviews for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own asset quality reviews" on public.asset_quality_reviews;
create policy "Users can update their own asset quality reviews"
on public.asset_quality_reviews for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own asset quality reviews" on public.asset_quality_reviews;
create policy "Users can delete their own asset quality reviews"
on public.asset_quality_reviews for delete
to authenticated
using ((select auth.uid()) = user_id);
