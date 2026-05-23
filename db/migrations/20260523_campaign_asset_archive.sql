-- VIP Campaign + Asset Archive Cleanup
-- Adds archive support without hard-deleting history.

alter table public.campaigns
add column if not exists archived_at timestamptz,
add column if not exists archived_reason text,
add column if not exists archived_by uuid;

alter table public.generated_assets
add column if not exists archived_at timestamptz,
add column if not exists archived_reason text,
add column if not exists archived_by uuid;

create index if not exists idx_campaigns_user_archived on public.campaigns(user_id, archived_at);
create index if not exists idx_generated_assets_user_archived on public.generated_assets(user_id, archived_at);
create index if not exists idx_generated_assets_campaign_archived on public.generated_assets(campaign_id, archived_at);
