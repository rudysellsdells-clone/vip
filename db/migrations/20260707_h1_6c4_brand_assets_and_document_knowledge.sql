-- H1.6C4 Brand assets and document knowledge uploads
-- Adds account logo/color fields and document metadata for uploaded knowledge sources.

create extension if not exists "pgcrypto";

alter table public.account_brand_profiles
  add column if not exists logo_url text,
  add column if not exists logo_storage_bucket text,
  add column if not exists logo_storage_path text,
  add column if not exists logo_file_name text,
  add column if not exists logo_mime_type text,
  add column if not exists logo_size_bytes bigint,
  add column if not exists brand_colors text[] not null default '{}';

alter table public.knowledge_sources
  add column if not exists original_file_name text,
  add column if not exists storage_bucket text,
  add column if not exists storage_path text,
  add column if not exists file_mime_type text,
  add column if not exists file_size_bytes bigint,
  add column if not exists extracted_at timestamptz;

-- Expand knowledge source type constraint to support uploaded documents.
alter table public.knowledge_sources
  drop constraint if exists knowledge_sources_source_type_check;

alter table public.knowledge_sources
  add constraint knowledge_sources_source_type_check check (
    source_type in (
      'website',
      'blog',
      'service_page',
      'email',
      'social_post',
      'proposal',
      'script',
      'case_study',
      'testimonial',
      'manual_note',
      'uploaded_document',
      'other'
    )
  );

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'brand-assets',
  'brand-assets',
  true,
  5242880,
  array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml', 'image/gif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'brand-knowledge',
  'brand-knowledge',
  false,
  20971520,
  array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Public read for logos only. Knowledge documents remain private.
drop policy if exists "Public can read brand assets" on storage.objects;
create policy "Public can read brand assets"
on storage.objects
for select
to public
using (bucket_id = 'brand-assets');

drop policy if exists "Authenticated users can upload account brand assets" on storage.objects;
create policy "Authenticated users can upload account brand assets"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'brand-assets'
  and (storage.foldername(name))[1] = 'accounts'
);

drop policy if exists "Authenticated users can upload account knowledge documents" on storage.objects;
create policy "Authenticated users can upload account knowledge documents"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'brand-knowledge'
  and (storage.foldername(name))[1] = 'accounts'
);
