-- Rudys VIP
-- Optional cleanup for already-created resubmitted assets that include internal trace lines.
-- This removes public body lines like:
-- Quality resubmission based on review: ...
-- Original asset ID: ...
-- New asset ID: ...
-- Source asset ID: ...
-- It does not delete records.

update public.generated_assets
set content = trim(
  regexp_replace(
    regexp_replace(
      regexp_replace(
        regexp_replace(
          regexp_replace(
            content,
            E'(^|\\n)Quality resubmission based on review:[^\\n]*(\\n|$)',
            E'\\n',
            'gi'
          ),
          E'(^|\\n)Original asset ID:[^\\n]*(\\n|$)',
          E'\\n',
          'gi'
        ),
        E'(^|\\n)New asset ID:[^\\n]*(\\n|$)',
        E'\\n',
        'gi'
      ),
      E'(^|\\n)Source asset ID:[^\\n]*(\\n|$)',
      E'\\n',
      'gi'
    ),
    E'\\n{3,}',
    E'\\n\\n',
    'g'
  )
)
where content ~* '(Quality resubmission based on review:|Original asset ID:|New asset ID:|Source asset ID:)';

notify pgrst, 'reload schema';
