-- VIP Asset Lifecycle / Working View Cleanup
-- Working screens should show only latest active, not archived, not superseded, not published assets.

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
add column if not exists quality_workflow_status text not null default 'not_checked',
add column if not exists auto_quality_attempts integer not null default 0,
add column if not exists quality_checked_at timestamptz,
add column if not exists review_ready_at timestamptz;

create index if not exists idx_generated_assets_working_views
on public.generated_assets(user_id, is_active_version, archived_at, superseded_by_asset_id, status, scheduling_status);

create index if not exists idx_generated_assets_calendar_working
on public.generated_assets(user_id, intended_publish_month, is_active_version, archived_at, scheduling_status);

create index if not exists idx_generated_assets_published
on public.generated_assets(user_id, published_at, published_via);

-- Any legacy asset already pointing to a newer asset should leave working views.
update public.generated_assets
set
  is_active_version = false,
  replaced_at = coalesce(replaced_at, now()),
  archived_at = coalesce(archived_at, now()),
  archive_reason = coalesce(archive_reason, 'superseded_by_newer_version')
where superseded_by_asset_id is not null
  and is_active_version = true;

notify pgrst, 'reload schema';
