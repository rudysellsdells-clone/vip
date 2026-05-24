-- Rudys VIP
-- Clear June 2026 campaign/calendar test content so the month can be regenerated cleanly.
-- This targets June campaign/calendar content only.

begin;

create temp table vip_june_campaigns as
select id
from public.campaigns
where campaign_month = '2026-06'
   or campaign_week_start_date between date '2026-06-01' and date '2026-06-30'
   or planned_start_date between date '2026-06-01' and date '2026-06-30'
   or to_jsonb(campaigns)::text ilike '%2026-06%'
   or (
      to_jsonb(campaigns)::text ilike '%June%'
      and to_jsonb(campaigns)::text ilike '%2026%'
   );

create temp table vip_june_assets as
select id
from public.generated_assets
where intended_publish_month = '2026-06'
   or planned_publish_date between date '2026-06-01' and date '2026-06-30'
   or scheduled_publish_at::date between date '2026-06-01' and date '2026-06-30'
   or campaign_id in (select id from vip_june_campaigns)
   or to_jsonb(generated_assets)::text ilike '%2026-06%'
   or (
      to_jsonb(generated_assets)::text ilike '%June%'
      and to_jsonb(generated_assets)::text ilike '%2026%'
   );

create temp table vip_june_calendar_items as
select id
from public.content_calendar_items
where intended_publish_month = '2026-06'
   or planned_publish_date between date '2026-06-01' and date '2026-06-30'
   or scheduled_publish_at::date between date '2026-06-01' and date '2026-06-30'
   or campaign_id in (select id from vip_june_campaigns)
   or to_jsonb(content_calendar_items)::text ilike '%2026-06%'
   or (
      to_jsonb(content_calendar_items)::text ilike '%June%'
      and to_jsonb(content_calendar_items)::text ilike '%2026%'
   );

create temp table vip_june_reviews as
select id
from public.asset_quality_reviews
where asset_id in (select id from vip_june_assets);

delete from public.quality_gate_decisions
where asset_id in (select id from vip_june_assets)
   or review_id in (select id from vip_june_reviews);

delete from public.asset_quality_reviews
where id in (select id from vip_june_reviews);

delete from public.publishing_execution_runs
where asset_id in (select id from vip_june_assets);

delete from public.content_calendar_items
where id in (select id from vip_june_calendar_items);

delete from public.generated_assets
where id in (select id from vip_june_assets);

delete from public.campaigns
where id in (select id from vip_june_campaigns);

delete from public.activity_log
where activity_type in (
  'monthly_campaign_package_generated',
  'monthly_publish_schedule_assigned'
)
and (
  metadata->>'month' = '2026-06'
  or metadata->>'intended_publish_month' = '2026-06'
  or metadata::text ilike '%2026-06%'
);

notify pgrst, 'reload schema';

commit;
