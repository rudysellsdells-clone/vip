# VIP H1.1D assetForPublishing Build Fix

## What this fixes

Vercel failed with:

```text
Cannot find name 'assetForPublishing'
```

The H1.1D LinkedIn destination-lock patch accidentally referenced `assetForPublishing` inside the `createPublishingExecutionRun(...)` helper, where the function parameter is named `asset`.

## File replaced

```text
src/app/api/publishing/assets/[assetId]/execute-zapier-mcp/route.ts
```

## Change made

Replaced:

```ts
assetType: assetForPublishing.asset_type,
```

with:

```ts
assetType: asset.asset_type,
```

No behavior changed. This only fixes the TypeScript build error while preserving the LinkedIn destination lock.

## Suggested commit message

```text
Fix LinkedIn destination lock build variable
```
