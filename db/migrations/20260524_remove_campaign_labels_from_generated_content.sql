-- Rudys VIP
-- Remove internal campaign labels like "# June 2026 Week 1:" from already-generated public content.
-- This is safe to run repeatedly.

update public.generated_assets
set content = trim(
  regexp_replace(
    regexp_replace(
      regexp_replace(
        content,
        E'(^|\\n)#?\\s*[A-Za-z]+\\s+[0-9]{4}\\s+Week\\s+[0-9]+\\s*:[^\\n]*(\\n|$)',
        E'\\n',
        'gi'
      ),
      E'(^|\\n)#?\\s*Week\\s+[0-9]+\\s*:[^\\n]*(\\n|$)',
      E'\\n',
      'gi'
    ),
    E'\\n{3,}',
    E'\\n\\n',
    'g'
  )
)
where content ~* '(^|\n)#?\s*[A-Za-z]+\s+[0-9]{4}\s+Week\s+[0-9]+\s*:'
   or content ~* '(^|\n)#?\s*Week\s+[0-9]+\s*:';

notify pgrst, 'reload schema';
