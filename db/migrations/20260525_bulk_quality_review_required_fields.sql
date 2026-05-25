-- Rudys VIP
-- Safe fields required by automatic/bulk quality review.
-- Run this if monthly generation succeeds but automatic quality review fails.

alter table public.generated_assets
add column if not exists quality_workflow_status text not null default 'not_checked',
add column if not exists auto_quality_attempts integer not null default 0,
add column if not exists parent_asset_id uuid,
add column if not exists superseded_by_asset_id uuid,
add column if not exists is_active_version boolean not null default true,
add column if not exists quality_checked_at timestamptz,
add column if not exists review_ready_at timestamptz;

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

create index if not exists idx_generated_assets_quality_workflow_status
on public.generated_assets(user_id, quality_workflow_status);

create index if not exists idx_generated_assets_active_version
on public.generated_assets(user_id, is_active_version);

create index if not exists idx_generated_assets_parent_asset_id
on public.generated_assets(parent_asset_id);

create index if not exists idx_asset_quality_reviews_asset_id
on public.asset_quality_reviews(asset_id);

notify pgrst, 'reload schema';
