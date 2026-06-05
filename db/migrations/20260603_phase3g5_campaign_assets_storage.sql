-- Phase 3G.5 campaign asset storage bucket
-- Purpose:
-- Create a durable public storage bucket for generated campaign images.
-- GalaxyAI image runs can be copied here so social posts have stable hosted media URLs.

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'campaign-assets',
  'campaign-assets',
  true,
  10485760,
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Service-role uploads bypass RLS. These policies are included for future UI/download support.
drop policy if exists "Public can read campaign assets" on storage.objects;

create policy "Public can read campaign assets"
on storage.objects
for select
to public
using (bucket_id = 'campaign-assets');

drop policy if exists "Authenticated users can upload their own campaign assets" on storage.objects;

create policy "Authenticated users can upload their own campaign assets"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'campaign-assets'
  and (storage.foldername(name))[1] = 'accounts'
);
