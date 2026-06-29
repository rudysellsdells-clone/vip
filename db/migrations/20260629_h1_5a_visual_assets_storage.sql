-- H1.5A Visual Asset Generation storage foundation
-- Safe to run more than once.
-- Ensures the public campaign-assets bucket exists for generated OpenAI post images.

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

drop policy if exists "Public can read campaign assets" on storage.objects;

create policy "Public can read campaign assets"
on storage.objects
for select
to public
using (bucket_id = 'campaign-assets');

drop policy if exists "Authenticated users can upload campaign assets folder" on storage.objects;

create policy "Authenticated users can upload campaign assets folder"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'campaign-assets'
  and (storage.foldername(name))[1] = 'accounts'
);
