-- H1.7C3A Marketing VIP GA4 synchronization collision guard
-- Closes stale/duplicate running jobs and enforces one active sync per source.
-- The application patch also aggregates normalized GA4 rows before insertion.

update public.analytics_sync_runs
set
  status = 'failed',
  error_message = coalesce(
    nullif(error_message, ''),
    'Synchronization was automatically closed after remaining in running status for more than 30 minutes.'
  ),
  details = coalesce(details, '{}'::jsonb) || jsonb_build_object(
    'auto_closed_by', 'h1.7c3a',
    'auto_closed_at', now()
  ),
  completed_at = coalesce(completed_at, now())
where status = 'running'
  and started_at < now() - interval '30 minutes';

with ranked_running as (
  select
    id,
    row_number() over (
      partition by source_id
      order by started_at desc, created_at desc, id desc
    ) as running_rank
  from public.analytics_sync_runs
  where status = 'running'
    and source_id is not null
)
update public.analytics_sync_runs run
set
  status = 'failed',
  error_message = coalesce(
    nullif(run.error_message, ''),
    'Duplicate concurrent synchronization was closed by the H1.7C3A guard.'
  ),
  details = coalesce(run.details, '{}'::jsonb) || jsonb_build_object(
    'auto_closed_by', 'h1.7c3a',
    'auto_closed_at', now(),
    'reason', 'duplicate_concurrent_sync'
  ),
  completed_at = coalesce(run.completed_at, now())
from ranked_running ranked
where run.id = ranked.id
  and ranked.running_rank > 1;

create unique index if not exists analytics_sync_runs_one_running_per_source_idx
  on public.analytics_sync_runs(source_id)
  where source_id is not null
    and status = 'running';

notify pgrst, 'reload schema';
