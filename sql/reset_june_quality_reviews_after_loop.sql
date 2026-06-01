-- Optional cleanup after the repeated quality-review loop.
-- This removes duplicate June quality reviews and resets June assets to not_checked
-- so you can re-test the fixed workflow cleanly.

begin;

delete from public.asset_quality_reviews r
using public.generated_assets a
where r.asset_id = a.id
  and (
    a.intended_publish_month = '2026-06'
    or left(coalesce(a.scheduled_publish_at::text, ''), 7) = '2026-06'
    or left(coalesce(a.planned_publish_date::text, ''), 7) = '2026-06'
    or left(coalesce(a.campaign_week_start_date::text, ''), 7) = '2026-06'
  );

update public.generated_assets
set
  quality_workflow_status = 'not_checked',
  quality_checked_at = null,
  review_ready_at = null
where
  (
    intended_publish_month = '2026-06'
    or left(coalesce(scheduled_publish_at::text, ''), 7) = '2026-06'
    or left(coalesce(planned_publish_date::text, ''), 7) = '2026-06'
    or left(coalesce(campaign_week_start_date::text, ''), 7) = '2026-06'
  )
  and archived_at is null
  and coalesce(is_active_version, true) = true
  and superseded_by_asset_id is null
  and published_at is null;

delete from public.activity_log
where activity_type = 'monthly_bulk_quality_review_batch_completed'
  and (
    metadata->>'month' = '2026-06'
    or description ilike '%2026-06%'
  );

notify pgrst, 'reload schema';

commit;
