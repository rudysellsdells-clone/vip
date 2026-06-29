# H1.5A Status Fix — Generated Visual Assets

This is a database-only fix for this runtime error:

> new row for relation "generated_assets" violates check constraint "generated_assets_status_check"

## Why it happened

H1.5A saves generated image records in `generated_assets` with `status = 'stored'` so visual assets do not get confused with text assets that are in review, approved, published, etc.

Your database still had the older `generated_assets_status_check` constraint that did not allow `stored`.

## What this does

This migration safely recreates the `generated_assets_status_check` constraint and adds `stored` as an allowed status.

## Files

- `db/migrations/20260629_h1_5a_generated_assets_stored_status_fix.sql`

## Apply order

1. Apply this ZIP to GitHub.
2. No Vercel deploy is required for the SQL itself, but redeploying is fine.
3. Run the SQL migration in Supabase.
4. Try generating the image again from an approved asset.

No app code changes are included in this patch.
