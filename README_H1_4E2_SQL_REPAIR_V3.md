# H1.4E2 SQL Repair V3 — Fully Safe Final Audit Migration

This is a database-only repair for the H1.4E2 migration.

## Why this exists

The prior repair still had a static SQL reference inside a guarded block. PostgreSQL can parse static SQL before the guard has a chance to skip it, so a missing optional column still caused the migration to fail.

## What this changes

- Removes the missing-column reference entirely.
- Uses dynamic SQL for optional backfills after confirming the table and columns exist.
- Adds `account_id` safely to H1.4E2 support tables when those tables exist.
- Creates indexes safely only when the tables exist.
- Creates account-aware RLS policies with a user fallback only when `user_id` exists.
- Keeps the migration idempotent, so it is safe after a partially failed earlier run.

## Apply order

1. Apply this repair patch over H1.4E2.
2. Open Supabase SQL Editor.
3. Clear the old SQL from the editor.
4. Paste/run the corrected file:

`db/migrations/20260629_h1_4e2_final_audit_account_scope.sql`

Do not run the old H1.4E2 migration text again.
