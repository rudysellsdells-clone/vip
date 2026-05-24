-- Optional cleanup
-- Deletes recent unplaced planned items that were created during broken calendar-generation tests.
-- Use ONLY if you want to remove the old unplaced planned records before regenerating.

delete from public.content_calendar_items
where coalesce(created_at, now()) >= now() - interval '14 days'
  and (intended_publish_month is null or intended_publish_month = '')
  and planned_publish_date is null
  and scheduled_publish_at is null
  and campaign_id is null;

notify pgrst, 'reload schema';
