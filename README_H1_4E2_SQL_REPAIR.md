# H1.4E2 SQL Repair — Missing `tool_runs.source_asset_id`

This is a database-only repair for the H1.4E2 migration failure:

```sql
ERROR: column run.source_asset_id does not exist
LINE 48: and run.source_asset_id = asset.id
```

## What happened

The original H1.4E2 migration assumed every VIP database had a `tool_runs.source_asset_id` column. Your installed database does not have that column, so the migration stopped during the optional tool-run backfill.

## What this fixes

This replacement migration:

- Keeps the H1.4E2 account-scope columns and RLS policies.
- Skips the `tool_runs.source_asset_id` backfill unless that column actually exists.
- Adds a safe JSON-input backfill for tool runs where the asset ID may be stored inside `input`.
- Is idempotent, so it is safe if the failed migration partially created some columns before stopping.

## Apply order

1. Apply this patch over H1.4E2 in GitHub.
2. In Supabase SQL Editor, run the corrected SQL from:
   `db/migrations/20260629_h1_4e2_final_audit_account_scope.sql`
3. Redeploy only if GitHub changed; this repair itself is database-only.

No app code, auth logic, publishing provider logic, landing page, or account workflow code is changed by this repair.
