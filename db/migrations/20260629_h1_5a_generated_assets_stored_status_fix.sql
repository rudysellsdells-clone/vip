-- H1.5A generated visual asset status repair
-- Safe to run more than once.
-- The first H1.5A image workflow stores visual assets with status = 'stored'.
-- Some existing databases still have the original generated_assets status check,
-- which does not include 'stored'. This expands the allowed status list without
-- changing any existing publishing/approval behavior.

alter table public.generated_assets
  drop constraint if exists generated_assets_status_check;

alter table public.generated_assets
  add constraint generated_assets_status_check
  check (
    status in (
      'draft',
      'needs_review',
      'approved',
      'rejected',
      'revision_requested',
      'published',
      'sent',
      'archived',
      'stored'
    )
  );
