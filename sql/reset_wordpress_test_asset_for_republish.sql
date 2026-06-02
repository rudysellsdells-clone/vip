-- VIP WordPress test asset reset
-- Use this only for workflow testing when a failed/terminated MCP attempt
-- incorrectly left the asset marked as sent/published.

begin;

update public.generated_assets
set
  status = 'approved',
  scheduling_status = case
    when scheduled_publish_at is not null then 'scheduled'
    else null
  end,
  published_at = null,
  published_via = null,
  published_reference = null,
  archived_at = null,
  archive_reason = null,
  is_active_version = true,
  superseded_by_asset_id = null
where id = '7bffa0ec-e24c-4457-bba9-62dfa09bcef7';

insert into public.activity_log (
  user_id,
  activity_type,
  title,
  description,
  metadata
)
select
  user_id,
  'asset_reset_for_wordpress_mcp_retest',
  'Asset reset for WordPress MCP retest',
  title,
  jsonb_build_object(
    'assetId', id,
    'reason', 'Previous failed/terminated MCP test left asset marked as published/sent.'
  )
from public.generated_assets
where id = '7bffa0ec-e24c-4457-bba9-62dfa09bcef7';

notify pgrst, 'reload schema';

commit;
