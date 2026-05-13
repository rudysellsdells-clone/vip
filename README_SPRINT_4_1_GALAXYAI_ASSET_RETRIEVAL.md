# Sprint 4.1 GalaxyAI Asset Retrieval

## Goal

Pull completed GalaxyAI media outputs back into VIP as campaign assets.

## What This Patch Adds

This patch updates:

```text
src/lib/galaxyai/types.ts
src/lib/galaxyai/client.ts
src/app/api/galaxyai/runs/[runId]/route.ts
```

## Behavior

When Rudy clicks **Check Status** for a GalaxyAI run:

1. VIP fetches the GalaxyAI run details.
2. If the run is completed, VIP fetches workflow media from GalaxyAI.
3. VIP filters media by the current GalaxyAI `runId`.
4. VIP saves media data into `galaxyai_runs.output`.
5. VIP creates a new `generated_assets` record with:

```text
asset_type = galaxyai_media
status = needs_review
```

The asset content contains the generated media URL(s), and metadata contains the full GalaxyAI media details.

## API Endpoints Used

GalaxyAI run details:

```text
GET https://api.galaxy.ai/api/v1/runs/{runId}
```

GalaxyAI workflow media:

```text
GET https://api.galaxy.ai/api/v1/workflows/{workflowId}/media
```

## Apply

1. Replace the patched files in your repo.
2. Commit.
3. Push.
4. Let Vercel redeploy.

Suggested commit message:

```text
Add GalaxyAI asset retrieval
```

## Test

1. Run an approved GalaxyAI prompt from VIP.
2. Wait until GalaxyAI completes.
3. Go to `/galaxyai`.
4. Click **Check Status**.
5. Confirm the run status becomes `completed`.
6. Open Supabase table `generated_assets`.
7. Confirm a new row exists with:

```text
asset_type = galaxyai_media
```

8. Open the campaign detail page.
9. Confirm the GalaxyAI media URL appears as a campaign asset.

## Notes

This patch stores GalaxyAI media URLs and metadata first.

A future sprint can download media into Supabase Storage for permanent app-owned storage.
