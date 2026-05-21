-- Rudys VIP Sprint 2.4
-- Branded What-If Story PDF exports and email draft prep records.

create extension if not exists "pgcrypto";

insert into storage.buckets (id, name, public)
values ('what-if-pdfs', 'what-if-pdfs', true)
on conflict (id) do update set public = true;

create table if not exists public.asset_exports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  asset_id uuid not null references public.generated_assets(id) on delete cascade,
  export_type text not null,
  status text not null default 'created',
  file_url text,
  file_path text,
  file_name text,
  mime_type text,
  subject text,
  body text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint asset_exports_type_check check (
    export_type in (
      'what_if_pdf',
      'gmail_draft_with_pdf',
      'other'
    )
  ),
  constraint asset_exports_status_check check (
    status in (
      'created',
      'prepared',
      'sent_to_zapier',
      'completed',
      'failed'
    )
  )
);

drop trigger if exists asset_exports_set_updated_at on public.asset_exports;
create trigger asset_exports_set_updated_at
before update on public.asset_exports
for each row execute function public.set_updated_at();

create index if not exists idx_asset_exports_user_id on public.asset_exports(user_id);
create index if not exists idx_asset_exports_asset_id on public.asset_exports(asset_id);
create index if not exists idx_asset_exports_type on public.asset_exports(export_type);
create index if not exists idx_asset_exports_status on public.asset_exports(status);

alter table public.asset_exports enable row level security;

drop policy if exists "Users can view their own asset exports" on public.asset_exports;
create policy "Users can view their own asset exports"
on public.asset_exports for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert their own asset exports" on public.asset_exports;
create policy "Users can insert their own asset exports"
on public.asset_exports for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own asset exports" on public.asset_exports;
create policy "Users can update their own asset exports"
on public.asset_exports for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own asset exports" on public.asset_exports;
create policy "Users can delete their own asset exports"
on public.asset_exports for delete
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can view their own what-if pdf files" on storage.objects;
create policy "Users can view their own what-if pdf files"
on storage.objects for select
to authenticated
using (
  bucket_id = 'what-if-pdfs'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "Users can upload their own what-if pdf files" on storage.objects;
create policy "Users can upload their own what-if pdf files"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'what-if-pdfs'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "Users can update their own what-if pdf files" on storage.objects;
create policy "Users can update their own what-if pdf files"
on storage.objects for update
to authenticated
using (
  bucket_id = 'what-if-pdfs'
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id = 'what-if-pdfs'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "Users can delete their own what-if pdf files" on storage.objects;
create policy "Users can delete their own what-if pdf files"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'what-if-pdfs'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
