# VIP Ready-for-Publishing Build Fix

## Problem

The build failed with:

```text
Type error: 'asset' is possibly 'undefined'
```

## Cause

The ready-for-publishing page filtered missing assets at runtime, but TypeScript did not narrow the type inside the render loop.

## Fix

This patch replaces:

```text
src/app/(app)/ready-for-publishing/page.tsx
```

with a version that uses:

```ts
type ReadyRow = {
  decision: DecisionRow;
  asset: AssetRow;
};

function hasAsset(row): row is ReadyRow {
  return Boolean(row.asset);
}
```

That makes TypeScript understand `asset` exists before rendering.

## Files Included

```text
src/app/(app)/ready-for-publishing/page.tsx
README_READY_FOR_PUBLISHING_BUILD_FIX.md
```

## Apply

1. Replace the included page file.
2. Commit.
3. Push.
4. Redeploy.

Suggested commit message:

```text
Fix ready queue asset typing
```

## Test

1. Run build.
2. Open `/ready-for-publishing`.
3. Confirm the page loads.
