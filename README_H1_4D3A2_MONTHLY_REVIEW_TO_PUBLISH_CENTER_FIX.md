# H1.4D3A2 — Monthly Review to Publish Center Routing Fix

This patch fixes the workflow gap where an approved item could still appear on Monthly Review but not appear in Publish Center after account scoping was added.

## Root cause

Some older/generated calendar assets can still be legacy user-owned rows with `account_id` missing. Monthly Review was still using legacy `user_id` visibility, while Publish Center was correctly using active workspace `account_id` visibility. That made approved legacy assets look like they disappeared from the workflow.

Not assigning a publish date was not the problem. Unscheduled approved assets are supposed to show under "Unscheduled / Publish Now" in Publish Center.

## What changed

- Publish Center now shows active workspace approved assets and MASTER-only legacy unassigned approved assets.
- Monthly Review now aligns with active workspace scoping and includes MASTER-only legacy unassigned rescue items.
- Approvals now aligns with active workspace scoping and includes MASTER-only legacy unassigned rescue items.
- Approving a legacy unassigned asset now assigns it to the user's active workspace.
- Monthly bulk approval now assigns approved legacy assets to the active workspace.
- Publishing Ready can preview a legacy unassigned asset under the active workspace settings, but live execution stays blocked until the asset is assigned.

## What did not change

- No SQL is required.
- No provider execution code is changed.
- No external Zapier, Facebook, LinkedIn, WordPress, Gmail, or GalaxyAI accounts are needed for this test.

## Testing checklist

1. Sign in as MASTER.
2. Select the Marketing VIP workspace.
3. Open `/content-calendar/monthly-review`.
4. Confirm the active workspace card appears.
5. Open `/publishing-schedule`.
6. Confirm the approved item appears under the approved queue, likely marked `Legacy unassigned` if it was created before account scoping.
7. Open the item from Publish Center.
8. Confirm Publishing Ready shows payload preview and blocks live execution if the asset is still legacy unassigned.
9. For future approvals, approve the item after this patch and confirm it is assigned to the active workspace automatically.

