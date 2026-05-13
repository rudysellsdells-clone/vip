# Sprint 4 GalaxyAI Values Shape Fix

## Issue

Running an approved GalaxyAI prompt returned:

```text
GalaxyAI request failed: 400 Bad Request
Input validation failed
values.prompt expected record, received string
values.campaignId expected record, received string
values.assetId expected record, received string
Unrecognized key: source
```

## Cause

The app was sending GalaxyAI run values like this:

```json
{
  "values": {
    "prompt": "string",
    "campaignId": "string",
    "assetId": "string"
  },
  "source": "..."
}
```

GalaxyAI expects each value under `values` to be an object/record, not a plain string.

The `source` key was also rejected by the runtime request, so this patch removes it.

## Fix

This patch updates:

```text
src/lib/galaxyai/client.ts
src/app/api/galaxyai/runs/route.ts
```

The app now sends:

```json
{
  "workflowId": "workflow_id_here",
  "values": {
    "prompt": {
      "value": "approved prompt content",
      "type": "text",
      "label": "Prompt"
    },
    "campaignId": {
      "value": "campaign id",
      "type": "text",
      "label": "Campaign ID"
    },
    "assetId": {
      "value": "asset id",
      "type": "text",
      "label": "Asset ID"
    }
  }
}
```

## Apply

1. Replace `src/lib/galaxyai/client.ts`.
2. Replace `src/app/api/galaxyai/runs/route.ts`.
3. Commit.
4. Push.
5. Let Vercel redeploy.

Suggested commit message:

```text
Fix GalaxyAI run values payload shape
```

## Test

1. Open a campaign.
2. Approve a `galaxyai_prompt` asset.
3. Select a GalaxyAI workflow.
4. Run it.
5. Confirm a row appears in `galaxyai_runs`.
6. Check run status from `/galaxyai`.

## Note

Some GalaxyAI workflows may require different input field names than `prompt`.
If a specific workflow expects another input name, we will add workflow-specific input mapping in the next patch.
