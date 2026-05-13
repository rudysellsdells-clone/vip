# Rudys VIP — Sprint 3 Approval Queue Patch

This patch adds the first approval system for Rudy’s Marketing Twin.

## What this adds

- Approval Queue page at `/approvals`
- Approve button for generated assets
- Reject button for generated assets
- Request Revision flow with notes
- API route: `/api/assets/[assetId]/approve`
- API route: `/api/assets/[assetId]/reject`
- API route: `/api/assets/[assetId]/revise`
- Approval records saved to the `approvals` table
- Asset status updates in `generated_assets`
- Activity log records for every approval action
- Campaign detail page updated with review actions

## Files included

- `src/components/approvals/AssetReviewActions.tsx`
- `src/app/(app)/approvals/page.tsx`
- `src/app/(app)/campaigns/[campaignId]/page.tsx`
- `src/app/api/assets/[assetId]/approve/route.ts`
- `src/app/api/assets/[assetId]/reject/route.ts`
- `src/app/api/assets/[assetId]/revise/route.ts`

## Important

This patch assumes Sprint 2 is already installed and generated assets are being saved to `generated_assets` with status `needs_review`.

## Test steps

1. Log into the app.
2. Open a campaign that has generated assets.
3. Approve one asset.
4. Confirm its status changes to `approved`.
5. Request revision on another asset.
6. Confirm its status changes to `revision_requested` and notes appear.
7. Reject another asset.
8. Open Supabase and confirm rows exist in `approvals`.
9. Confirm `activity_log` has records for the actions.
10. Open `/approvals` and confirm pending assets appear there.

## Sprint 3 success criteria

Sprint 3 is complete when Rudy can approve, reject, and request revisions on generated assets, and every decision is saved to Supabase.

## Guardrail note

This sprint does not publish, send, or run GalaxyAI. It only creates the approval layer needed before those external actions are allowed.
