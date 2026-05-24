-- Rudys VIP
-- WordPress publishing run constraint fix
-- Allows WordPress/Zapier blog draft execution records in publishing_execution_runs.

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'publishing_execution_runs_provider_check'
  ) then
    alter table public.publishing_execution_runs
    drop constraint publishing_execution_runs_provider_check;
  end if;
end $$;

alter table public.publishing_execution_runs
add constraint publishing_execution_runs_provider_check check (
  provider in (
    'zapier',
    'zapier_mcp',
    'galaxyai',
    'galaxy_ai',
    'wordpress',
    'manual'
  )
);

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'publishing_execution_runs_channel_check'
  ) then
    alter table public.publishing_execution_runs
    drop constraint publishing_execution_runs_channel_check;
  end if;
end $$;

alter table public.publishing_execution_runs
add constraint publishing_execution_runs_channel_check check (
  channel in (
    'linkedin',
    'facebook',
    'gmail',
    'galaxyai',
    'wordpress',
    'manual'
  )
);
