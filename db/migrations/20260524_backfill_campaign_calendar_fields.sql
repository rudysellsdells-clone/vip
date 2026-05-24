-- Rudys VIP
-- Backfill campaign calendar fields so monthly calendar can see existing generated content.

-- Copy campaign month/week context onto generated assets when possible.
update public.generated_assets ga
set
  intended_publish_month = coalesce(ga.intended_publish_month, c.campaign_month),
  campaign_week_number = coalesce(ga.campaign_week_number, c.campaign_week_number),
  campaign_week_start_date = coalesce(ga.campaign_week_start_date, c.campaign_week_start_date)
from public.campaigns c
where ga.campaign_id = c.id
  and ga.user_id = c.user_id
  and (
    ga.intended_publish_month is null
    or ga.campaign_week_number is null
    or ga.campaign_week_start_date is null
  );

-- If an asset has a scheduled publish time but no planned publish date, use the scheduled date.
update public.generated_assets
set
  planned_publish_date = scheduled_publish_at::date,
  intended_publish_month = coalesce(intended_publish_month, to_char(scheduled_publish_at, 'YYYY-MM'))
where scheduled_publish_at is not null
  and (planned_publish_date is null or intended_publish_month is null);

-- Same idea for content calendar items.
update public.content_calendar_items cci
set
  intended_publish_month = coalesce(cci.intended_publish_month, c.campaign_month),
  campaign_week_number = coalesce(cci.campaign_week_number, c.campaign_week_number),
  campaign_week_start_date = coalesce(cci.campaign_week_start_date, c.campaign_week_start_date)
from public.campaigns c
where cci.campaign_id = c.id
  and cci.user_id = c.user_id
  and (
    cci.intended_publish_month is null
    or cci.campaign_week_number is null
    or cci.campaign_week_start_date is null
  );

update public.content_calendar_items
set
  planned_publish_date = scheduled_publish_at::date,
  intended_publish_month = coalesce(intended_publish_month, to_char(scheduled_publish_at, 'YYYY-MM'))
where scheduled_publish_at is not null
  and (planned_publish_date is null or intended_publish_month is null);

-- Refresh Supabase/PostgREST schema cache just in case.
notify pgrst, 'reload schema';
