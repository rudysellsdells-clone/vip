# Sprint 4 — GalaxyAI Integration

This patch adds the safe GalaxyAI integration layer for Rudys VIP.

## What it adds

- Sync GalaxyAI workflows from GalaxyAI into Supabase
- GalaxyAI workflows page at `/galaxyai`
- Start a GalaxyAI run from an approved `galaxyai_prompt` asset
- Save GalaxyAI run records in `galaxyai_runs`
- Save tool activity in `tool_runs`
- Check GalaxyAI run status
- Basic webhook endpoint at `/api/webhooks/galaxyai`

## Files included

```text
src/lib/galaxyai/client.ts
src/lib/galaxyai/types.ts
src/app/api/galaxyai/workflows/route.ts
src/app/api/galaxyai/runs/route.ts
src/app/api/galaxyai/runs/[runId]/route.ts
src/app/api/webhooks/galaxyai/route.ts
src/app/(app)/galaxyai/page.tsx
src/app/(app)/campaigns/[campaignId]/page.tsx
src/components/galaxyai/SyncGalaxyAiWorkflowsButton.tsx
src/components/galaxyai/RunGalaxyAiAssetButton.tsx
src/components/galaxyai/RefreshGalaxyAiRunButton.tsx
src/components/approvals/AssetReviewActions.tsx
src/types/database.types.ts
```

## Required Vercel environment variable

Add this in Vercel:

```bash
GALAXYAI_API_KEY=your_new_galaxyai_key
```

Confirm this is also already set:

```bash
NEXT_PUBLIC_APP_URL=https://vip-theta-eight.vercel.app
```

Then redeploy without cache.

## Required database tables

This patch uses tables already included in the database schema:

- `galaxyai_workflows`
- `galaxyai_runs`
- `tool_runs`
- `generated_assets`
- `activity_log`

If any of those tables are missing, rerun the schema or create those tables.

## How to test

1. Log into the app.
2. Go to `/galaxyai`.
3. Click **Sync GalaxyAI Workflows**.
4. Confirm workflows appear.
5. Open a campaign with generated assets.
6. Approve the `galaxyai_prompt` asset.
7. Select a GalaxyAI workflow.
8. Click **Run Approved Prompt in GalaxyAI**.
9. Confirm a row appears in Supabase table `galaxyai_runs`.
10. Go back to `/galaxyai` and click **Check Status**.

## Guardrail

This patch will only run GalaxyAI from an asset that is:

- `asset_type = galaxyai_prompt`
- `status = approved`

That keeps the approval gate intact.

## Notes

This integration uses the GalaxyAI REST API first. GalaxyAI MCP can be added later after the app's core workflow is stable.
