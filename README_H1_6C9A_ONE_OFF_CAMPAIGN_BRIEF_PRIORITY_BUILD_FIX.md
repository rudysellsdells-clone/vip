# H1.6C9A — One-Off Campaign Brief Priority Build Fix

This is a small TypeScript build fix for H1.6C9.

## Problem

Vercel failed with:

```text
Argument of type 'MarketingAssetPack | null' is not assignable to parameter of type 'MarketingAssetPack'.
```

The runtime logic was correct, but TypeScript did not know that `assetPackIsReviewReady(openAiResult)` also proved `openAiResult` was non-null.

## Fix

Updated `assetPackIsReviewReady` to be a TypeScript type guard:

```ts
function assetPackIsReviewReady(
  assetPack: MarketingAssetPack | null | undefined,
): assetPack is MarketingAssetPack
```

This allows the compiler to safely narrow `openAiResult` from `MarketingAssetPack | null` to `MarketingAssetPack` inside the review-ready branch.

## Files Changed

- `src/lib/ai/asset-pack-generator.ts`

## SQL Required

No SQL required.

## How to Apply

Unzip directly into the repo root and replace the matching file.
