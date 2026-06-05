# VIP Phase 3G.4 GalaxyAI Metadata Json Build Fix

## What this fixes

Vercel failed with:

```text
Property 'sourceSocialAssetType' does not exist on type 'string | number | boolean | { [key: string]: Json | undefined; } | Json[]'.
```

Supabase types `metadata` as generic `Json`, which can be an object, string, number, boolean, array, or null. TypeScript will not allow direct property access until the value is narrowed to an object.

## File replaced

```text
src/app/api/galaxyai/runs/route.ts
```

## Change made

Added safe helpers:

```ts
function jsonRecord(value: unknown): Record<string, unknown>
function stringOrNull(value: unknown): string | null
function numberOrNull(value: unknown): number | null
```

Then changed the GalaxyAI run input to read metadata from a narrowed object:

```ts
const assetMetadata = jsonRecord(asset.metadata);
```

No behavior changed. This only fixes TypeScript's JSON narrowing issue.

## Suggested commit message

```text
Fix GalaxyAI image prompt metadata type narrowing
```
