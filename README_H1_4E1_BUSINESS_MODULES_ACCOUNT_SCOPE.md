# H1.4E1 — Business Modules Account Scope

This patch hardens the remaining business modules so they use the active VIP workspace/account instead of legacy user-only ownership.

## What this patch scopes

- Prospects
- Opportunities
- Link Builder
  - directory profiles
  - discovered directory opportunities
  - prepared submissions
  - acquired backlink verification
- Knowledge Library / clone memory
  - digital clone profiles
  - brand rules
  - content examples
  - knowledge sources
  - clone context used during campaign generation and revision
- GalaxyAI
  - workflow sync visibility
  - run visibility
  - run execution from approved prompt assets
  - status/media retrieval

## SQL migration included

Run this in Supabase after deploying the code:

`db/migrations/20260629_h1_4e1_business_modules_account_scope.sql`

The migration adds `account_id` to:

- `prospects`
- `opportunities`
- `directory_profiles`
- `directory_opportunities`
- `directory_submissions`
- `acquired_backlinks`
- `galaxyai_workflows`

It also backfills existing rows where possible and adds account-aware RLS policies.

## Important behavior changes

- MASTER users see data for the selected active workspace.
- Client users only see records for workspaces they can access.
- New prospects, opportunities, link-builder records, memory records, and GalaxyAI workflow references are created under the active workspace.
- GalaxyAI prompt execution now requires the approved prompt asset to be assigned to a workspace the user can manage.
- Legacy user-owned RLS policies remain as fallback, but the app now filters these modules by `account_id`.

## Apply order

1. Apply this ZIP to the repo root.
2. Deploy to Vercel.
3. Run the SQL migration in Supabase.
4. Test as MASTER with Marketing VIP selected.
5. Test as a client user and confirm they cannot see Marketing VIP data.

## Suggested test path

1. MASTER → select Marketing VIP workspace.
2. Visit `/prospects` and create a test prospect.
3. Visit `/opportunities` and create a test opportunity from that prospect.
4. Visit `/knowledge` and add a small test source/example.
5. Visit `/brand-voice` and confirm clone profile/rules stay in the active workspace.
6. Visit `/link-builder` and confirm directory profile/opportunities stay in the active workspace.
7. Visit `/galaxyai` and confirm workflows/runs shown are for the active workspace.
8. Sign in as `mainclientcenter@gmail.com` and confirm that account does not see Marketing VIP records.

No public landing page, ZapierMCP publishing, Publish Center, calendar, or quality-review UI changes are included in this patch.
