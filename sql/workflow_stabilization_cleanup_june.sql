-- VIP Workflow Stabilization Cleanup for June 2026
-- Purpose:
-- 1. Keep only the latest active version in each asset family.
-- 2. Archive V1 when V2 exists.
-- 3. Archive duplicate V2/newer versions created by double-clicks or duplicate resubmission calls.
-- 4. Preserve history; do not delete content.

begin;

alter table public.generated_assets
add column if not exists parent_asset_id uuid,
add column if not exists superseded_by_asset_id uuid,
add column if not exists is_active_version boolean not null default true,
add column if not exists replaced_at timestamptz,
add column if not exists archived_at timestamptz,
add column if not exists archive_reason text,
add column if not exists published_at timestamptz,
add column if not exists published_via text,
add column if not exists published_reference text,
add column if not exists metadata jsonb not null default '{}'::jsonb;

-- First, normalize parent ids for obvious child versions if parent_asset_id is missing
-- but metadata contains an originalAssetId.
update public.generated_assets
set parent_asset_id = nullif(metadata->>'originalAssetId', '')::uuid
where parent_asset_id is null
  and metadata ? 'originalAssetId'
  and (metadata->>'originalAssetId') ~* '^[0-9a-f-]{36}$';

-- Archive any row that already points to a replacement but is still active.
update public.generated_assets
set
  is_active_version = false,
  archived_at = coalesce(archived_at, now()),
  replaced_at = coalesce(replaced_at, now()),
  archive_reason = coalesce(archive_reason, 'superseded_by_newer_version')
where superseded_by_asset_id is not null
  and is_active_version = true;

-- For June assets, determine the latest version per root asset family.
-- Root family = parent_asset_id when present, otherwise the asset's own id.
with june_assets as (
  select
    a.*,
    coalesce(a.parent_asset_id, a.id) as root_asset_id
  from public.generated_assets a
  where
    (
      a.intended_publish_month = '2026-06'
      or left(coalesce(a.scheduled_publish_at::text, ''), 7) = '2026-06'
      or left(coalesce(a.planned_publish_date::text, ''), 7) = '2026-06'
      or left(coalesce(a.campaign_week_start_date::text, ''), 7) = '2026-06'
      or left(coalesce(a.created_at::text, ''), 7) = '2026-06'
    )
),
latest_per_root as (
  select distinct on (root_asset_id)
    root_asset_id,
    id as latest_asset_id
  from june_assets
  order by
    root_asset_id,
    coalesce(version, 1) desc,
    created_at desc,
    id desc
)
update public.generated_assets old_asset
set
  is_active_version = false,
  superseded_by_asset_id = latest.latest_asset_id,
  archived_at = coalesce(old_asset.archived_at, now()),
  replaced_at = coalesce(old_asset.replaced_at, now()),
  archive_reason = coalesce(old_asset.archive_reason, 'archived_duplicate_or_superseded_version')
from latest_per_root latest
where coalesce(old_asset.parent_asset_id, old_asset.id) = latest.root_asset_id
  and old_asset.id <> latest.latest_asset_id
  and (
    old_asset.archived_at is null
    or old_asset.is_active_version = true
    or old_asset.superseded_by_asset_id is null
  );

-- Ensure the latest per root is active and visible if not published.
with june_assets as (
  select
    a.*,
    coalesce(a.parent_asset_id, a.id) as root_asset_id
  from public.generated_assets a
  where
    (
      a.intended_publish_month = '2026-06'
      or left(coalesce(a.scheduled_publish_at::text, ''), 7) = '2026-06'
      or left(coalesce(a.planned_publish_date::text, ''), 7) = '2026-06'
      or left(coalesce(a.campaign_week_start_date::text, ''), 7) = '2026-06'
      or left(coalesce(a.created_at::text, ''), 7) = '2026-06'
    )
),
latest_per_root as (
  select distinct on (root_asset_id)
    id as latest_asset_id
  from june_assets
  order by
    root_asset_id,
    coalesce(version, 1) desc,
    created_at desc,
    id desc
)
update public.generated_assets latest
set
  is_active_version = true,
  superseded_by_asset_id = null,
  archived_at = null,
  archive_reason = null
from latest_per_root roots
where latest.id = roots.latest_asset_id
  and latest.published_at is null
  and coalesce(latest.status, '') <> 'published'
  and coalesce(latest.scheduling_status, '') <> 'published';

notify pgrst, 'reload schema';

commit;
