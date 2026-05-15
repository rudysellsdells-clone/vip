# Sprint 5.3 Zapier Prepare Source Asset Fix

## Issue

The Facebook `tool_runs` row was being created, but the row did not clearly contain the approved Facebook post data needed for a clean execution trace.

That made it difficult to prove that the approved `facebook_post` asset was the source of the prepared Zapier action.

## Fix

This patch updates:

```text
src/app/api/zapier/prepare-action/route.ts
```

The prepare route now stores a full snapshot in `tool_runs.input`:

```json
{
  "assetId": "...",
  "campaignId": "...",
  "sourceAsset": {
    "id": "...",
    "campaignId": "...",
    "assetType": "facebook_post",
    "title": "...",
    "content": "...",
    "status": "approved",
    "version": 1,
    "metadata": {},
    "createdAt": "...",
    "updatedAt": "..."
  },
  "approval": {
    "id": "...",
    "status": "approved",
    "notes": null,
    "approvedAt": "...",
    "createdAt": "..."
  },
  "preparedAction": {
    "app": "Facebook Pages",
    "action": "page_stream",
    "params": {
      "page": "...",
      "pageName": "mccormick.web.marketing",
      "requiredPageName": "mccormick.web.marketing",
      "message": "..."
    }
  },
  "safety": {
    "requiresApprovedAsset": true,
    "assetStatusAtPreparation": "approved",
    "externalExecutionRequiresFinalClick": true
  }
}
```

## Why This Matters

Every new Zapier tool run becomes self-contained and auditable.

You can now verify:

- Which approved asset created the Zapier action
- What the approved content was at preparation time
- Which approval record existed
- Which Zapier app/action was prepared
- Which Facebook page value/message was sent into the prepared action

## Apply

1. Replace `src/app/api/zapier/prepare-action/route.ts`.
2. Commit.
3. Push.
4. Redeploy Vercel.

Suggested commit message:

```text
Store approved asset snapshot in Zapier tool runs
```

## Test

1. Approve a `facebook_post` asset.
2. Go to `/zapier`.
3. Click **Prepare Zapier Action**.
4. Open Supabase `tool_runs`.
5. Find the newest Facebook row.
6. Confirm `input.sourceAsset.content` and `input.preparedAction.params.message` are populated.
7. Then test the publish execution.

## Important

Old `tool_runs` rows will not be backfilled.

Create a fresh prepared Facebook action after applying this patch.
