-- H1.7C2 Marketing VIP UTM taxonomy and automatic publishing attribution
-- Depends on H1.7A, H1.7B, and H1.7C1 analytics migrations.
-- Adds account-scoped taxonomy settings, persistent campaign/asset slugs,
-- generated tracking-link records, and publishing-run attribution fields.

alter table public.campaigns
  add column if not exists analytics_campaign_slug text;

alter table public.generated_assets
  add column if not exists analytics_content_slug text;

create index if not exists campaigns_analytics_campaign_slug_idx
  on public.campaigns(account_id, analytics_campaign_slug)
  where analytics_campaign_slug is not null;

create index if not exists generated_assets_analytics_content_slug_idx
  on public.generated_assets(account_id, analytics_content_slug)
  where analytics_content_slug is not null;

create table if not exists public.analytics_utm_settings (
  account_id uuid primary key references public.accounts(id) on delete cascade,
  taxonomy_version text not null default 'h1.7c2',
  default_email_source text not null default 'email',
  default_website_source text not null default 'website',
  default_sms_source text not null default 'sms',
  include_audience_term boolean not null default true,
  append_link_to_social boolean not null default true,
  append_link_to_email boolean not null default true,
  source_overrides jsonb not null default '{}'::jsonb,
  medium_overrides jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.analytics_tracking_links (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  campaign_id uuid references public.campaigns(id) on delete set null,
  asset_id uuid not null references public.generated_assets(id) on delete cascade,
  channel text not null,
  destination_url text not null,
  tracked_url text not null,
  utm_source text not null,
  utm_medium text not null,
  utm_campaign text not null,
  utm_content text not null,
  utm_term text,
  vip_campaign uuid,
  vip_asset uuid not null,
  taxonomy_version text not null default 'h1.7c2',
  is_current boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (asset_id, channel)
);

create index if not exists analytics_tracking_links_account_created_idx
  on public.analytics_tracking_links(account_id, created_at desc);

create index if not exists analytics_tracking_links_campaign_idx
  on public.analytics_tracking_links(account_id, campaign_id, created_at desc)
  where campaign_id is not null;

drop trigger if exists analytics_utm_settings_set_updated_at
  on public.analytics_utm_settings;
create trigger analytics_utm_settings_set_updated_at
before update on public.analytics_utm_settings
for each row execute function public.set_updated_at();

drop trigger if exists analytics_tracking_links_set_updated_at
  on public.analytics_tracking_links;
create trigger analytics_tracking_links_set_updated_at
before update on public.analytics_tracking_links
for each row execute function public.set_updated_at();

alter table public.publishing_execution_runs
  add column if not exists campaign_id uuid references public.campaigns(id) on delete set null,
  add column if not exists tracking_link_id uuid references public.analytics_tracking_links(id) on delete set null,
  add column if not exists destination_url text,
  add column if not exists tracked_url text,
  add column if not exists attribution jsonb not null default '{}'::jsonb;

create index if not exists publishing_execution_runs_tracking_link_idx
  on public.publishing_execution_runs(tracking_link_id)
  where tracking_link_id is not null;

alter table public.analytics_utm_settings enable row level security;
alter table public.analytics_tracking_links enable row level security;

drop policy if exists "Account members can view UTM settings"
  on public.analytics_utm_settings;
create policy "Account members can view UTM settings"
on public.analytics_utm_settings
for select
to authenticated
using (public.user_can_view_account(account_id));

drop policy if exists "Account managers can insert UTM settings"
  on public.analytics_utm_settings;
create policy "Account managers can insert UTM settings"
on public.analytics_utm_settings
for insert
to authenticated
with check (public.user_can_manage_account(account_id));

drop policy if exists "Account managers can update UTM settings"
  on public.analytics_utm_settings;
create policy "Account managers can update UTM settings"
on public.analytics_utm_settings
for update
to authenticated
using (public.user_can_manage_account(account_id))
with check (public.user_can_manage_account(account_id));

drop policy if exists "Account members can view tracking links"
  on public.analytics_tracking_links;
create policy "Account members can view tracking links"
on public.analytics_tracking_links
for select
to authenticated
using (public.user_can_view_account(account_id));

drop policy if exists "Account managers can insert tracking links"
  on public.analytics_tracking_links;
create policy "Account managers can insert tracking links"
on public.analytics_tracking_links
for insert
to authenticated
with check (public.user_can_manage_account(account_id));

drop policy if exists "Account managers can update tracking links"
  on public.analytics_tracking_links;
create policy "Account managers can update tracking links"
on public.analytics_tracking_links
for update
to authenticated
using (public.user_can_manage_account(account_id))
with check (public.user_can_manage_account(account_id));

grant select, insert, update on table public.analytics_utm_settings to authenticated;
grant select, insert, update on table public.analytics_tracking_links to authenticated;

notify pgrst, 'reload schema';
