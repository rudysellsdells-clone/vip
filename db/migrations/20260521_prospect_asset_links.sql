-- Rudys VIP Sprint 2.6
-- Links generated assets, especially What-If Stories, to prospect records.

create extension if not exists "pgcrypto";

create table if not exists public.prospect_asset_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  prospect_id uuid not null,
  asset_id uuid not null references public.generated_assets(id) on delete cascade,
  relationship_type text not null default 'what_if_story',
  status text not null default 'active',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint prospect_asset_links_relationship_check check (
    relationship_type in (
      'what_if_story',
      'outreach_email',
      'pdf_export',
      'campaign_asset',
      'other'
    )
  ),
  constraint prospect_asset_links_status_check check (
    status in ('active', 'archived')
  )
);

drop trigger if exists prospect_asset_links_set_updated_at on public.prospect_asset_links;
create trigger prospect_asset_links_set_updated_at
before update on public.prospect_asset_links
for each row execute function public.set_updated_at();

create unique index if not exists idx_prospect_asset_links_unique
on public.prospect_asset_links(user_id, prospect_id, asset_id, relationship_type);

create index if not exists idx_prospect_asset_links_user_id on public.prospect_asset_links(user_id);
create index if not exists idx_prospect_asset_links_prospect_id on public.prospect_asset_links(prospect_id);
create index if not exists idx_prospect_asset_links_asset_id on public.prospect_asset_links(asset_id);

alter table public.prospect_asset_links enable row level security;

drop policy if exists "Users can view their own prospect asset links" on public.prospect_asset_links;
create policy "Users can view their own prospect asset links"
on public.prospect_asset_links for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert their own prospect asset links" on public.prospect_asset_links;
create policy "Users can insert their own prospect asset links"
on public.prospect_asset_links for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own prospect asset links" on public.prospect_asset_links;
create policy "Users can update their own prospect asset links"
on public.prospect_asset_links for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own prospect asset links" on public.prospect_asset_links;
create policy "Users can delete their own prospect asset links"
on public.prospect_asset_links for delete
to authenticated
using ((select auth.uid()) = user_id);
