# VIP Phase 3G.5 Social Image Metadata JSON Build Fix

## What this fixes

Vercel failed with:

```text
Property 'hostedImageUrl' does not exist on type '{}'.
```

The generated social image asset metadata is typed as Supabase `Json`, so TypeScript cannot safely read:

```ts
createdSocialImageAsset?.metadata?.hostedImageUrl
```

until the metadata is narrowed to a plain object.

## File replaced

```text
src/app/api/galaxyai/runs/[runId]/route.ts
```

## Change made

Added a narrowed metadata object:

```ts
const createdSocialImageMetadata = jsonRecord(createdSocialImageAsset?.metadata);
```

Then changed the output field to read:

```ts
stringOrNull(createdSocialImageMetadata.hostedImageUrl)
```

No behavior changed. This only fixes TypeScript's JSON metadata narrowing.

## Suggested commit message

```text
Fix GalaxyAI social image metadata type narrowing
```
