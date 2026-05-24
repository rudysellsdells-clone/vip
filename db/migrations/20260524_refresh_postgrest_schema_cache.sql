-- Optional Supabase/PostgREST schema cache refresh
-- Run this if Supabase says a newly added column is missing from the schema cache.

notify pgrst, 'reload schema';
