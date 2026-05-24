-- Rudys VIP
-- Ensure monthly campaign generator fields exist and schema cache is refreshed.
-- Safe to run repeatedly.

alter table public.campaigns
add column if not exists campaign_month text,
add column if not exists campaign_week_number integer,
add column if not exists campaign_week_start_date date,
add column if not exists campaign_week_end_date date,
add column if not exists planned_start_date date,
add column if not exists planned_end_date date,
add column if not exists metadata jsonb not null default '{}'::jsonb;

-- Do not add idea here unless your campaigns table truly lacks it.
-- The current error proves campaigns.idea already exists and is NOT NULL.
-- This refresh helps PostgREST recognize the latest shape.

notify pgrst, 'reload schema';
