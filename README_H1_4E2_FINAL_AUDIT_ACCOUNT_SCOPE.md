# H1.4E2 — Final Audit + Cleanup Account Scope

This patch tightens the remaining account/workspace edges after H1.4E1.

## What this patch hardens

- Dashboard prospect/opportunity summaries now use the active workspace.
- Archive views now use the active workspace.
- Orphan asset cleanup now requires active workspace manage permission.
- Zapier audit page now shows only the active workspace's Zapier/tool/publishing records.
- What-If Success Story pages now use the active workspace.
- Prospect-specific What-If Story generation now writes `account_id` to the generated asset, link, and activity records.
- What-If PDF export, Gmail draft preparation, and Gmail draft execution now require asset/workspace access.
- Facebook/LinkedIn prepare routes now use asset access guards and write account-scoped Zapier policies/tool runs/activity.
- GalaxyAI media attachment lookup now prefers `account_id` when available.
- Publishing execution audit records now store `account_id`.

## Required SQL

Run this migration in Supabase after deploying the code:

`db/migrations/20260629_h1_4e2_final_audit_account_scope.sql`

It adds `account_id` to:

- `asset_exports`
- `prospect_asset_links`
- `publishing_execution_runs`
- `zapier_action_policies`

It also backfills from linked assets/prospects where possible and updates RLS for those support/audit tables.

## Apply order

1. Apply this ZIP to GitHub.
2. Deploy to Vercel.
3. Run the SQL migration in Supabase.
4. Test as MASTER with Marketing VIP selected.
5. Test as a client user and confirm they only see their own workspace records.

## Notes

No public landing page, login styling, publishing provider configuration, or new feature logic was changed.
