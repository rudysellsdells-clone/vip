-- VIP Quality Review Required Fields
-- Safe migration for bulk/manual quality review.

create table if not exists public.asset_quality_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  asset_id uuid not null,
  created_at timestamptz not null default now()
);

alter table public.asset_quality_reviews
add column if not exists summary text,
add column if not exists strengths jsonb not null default '[]'::jsonb,
add column if not exists improvements jsonb not null default '[]'::jsonb,
add column if not exists suggested_revision text,
add column if not exists overall_score numeric,
add column if not exists brand_voice_score numeric,
add column if not exists clarity_score numeric,
add column if not exists cta_score numeric,
add column if not exists seo_aio_score numeric,
add column if not exists conversion_score numeric,
add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.generated_assets
add column if not exists quality_workflow_status text not null default 'not_checked',
add column if not exists quality_checked_at timestamptz,
add column if not exists review_ready_at timestamptz,
add column if not exists is_active_version boolean not null default true,
add column if not exists superseded_by_asset_id uuid,
add column if not exists archived_at timestamptz,
add column if not exists published_at timestamptz,
add column if not exists scheduling_status text;

create index if not exists idx_asset_quality_reviews_user_asset
on public.asset_quality_reviews(user_id, asset_id);

create index if not exists idx_generated_assets_quality_review_queue
on public.generated_assets(user_id, quality_workflow_status, is_active_version, archived_at);

notify pgrst, 'reload schema';
