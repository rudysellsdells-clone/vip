-- VIP Facebook test asset reset
-- Use this when a Facebook MCP attempt was marked published in VIP
-- but no ZapierMCP run/post was actually confirmed.

begin;

update public.generated_assets
set
  status = 'approved',
  scheduling_status = case
    when scheduled_publish_at is not null then 'scheduled'
    else 'unscheduled'
  end,
  published_at = null,
  published_via = null,
  published_reference = null,
  archived_at = null,
  archive_reason = null,
  is_active_version = true,
  superseded_by_asset_id = null,
  updated_at = now()
where id = 'cf19d1a3-61ba-4a1d-b540-9f5063053f95';

insert into public.activity_log (
  user_id,
  activity_type,
  title,
  description,
  metadata
)
select
  user_id,
  'asset_reset_for_facebook_mcp_retest',
  'Asset reset for Facebook MCP retest',
  title,
  jsonb_build_object(
    'assetId', id,
    'reason', 'VIP marked Facebook asset published but no ZapierMCP run was confirmed.',
    'resetAt', now()
  )
from public.generated_assets
where id = 'cf19d1a3-61ba-4a1d-b540-9f5063053f95';

notify pgrst, 'reload schema';

commit;
