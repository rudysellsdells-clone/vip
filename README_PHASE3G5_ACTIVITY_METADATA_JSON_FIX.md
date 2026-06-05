# VIP Phase 3G.5 Activity Metadata JSON Build Fix

## What this fixes

Vercel failed with:

```text
Type error: Type '{ localRunId: string; galaxyRunId: string; status: string; mediaCount: number; mediaAssetCreated: boolean; mediaAssetId: {} | null; socialImageAssetCreated: boolean; socialImageAssetId: {} | null; }' is not assignable to type 'Json | undefined'.
```

The Supabase response IDs for created media assets were inferred too broadly, so TypeScript saw:

```text
{} | null
```

instead of JSON-safe string values.

## File replaced

```text
src/app/api/galaxyai/runs/[runId]/route.ts
```

## Change made

The activity metadata block now uses:

```ts
metadata: toJson({
  localRunId: stringOrNull(localRun.id),
  galaxyRunId: stringOrNull(localRun.galaxy_run_id),
  mediaAssetId: stringOrNull(createdMediaAsset?.id),
  socialImageAssetId: stringOrNull(createdSocialImageAsset?.id),
})
```

This keeps the metadata JSON-safe and satisfies the generated Supabase `Json` type.

No behavior changed. This is only a TypeScript build fix.

## Suggested commit message

```text
Fix GalaxyAI run activity metadata JSON types
```
