# VIP Asset Lifecycle Compatibility Build Fix

## Problem

Vercel build failed with:

```text
Export markAssetPublished doesn't exist in target module
```

The last workflow stabilization patch replaced:

```text
src/lib/assets/asset-lifecycle.ts
```

and accidentally removed the older `markAssetPublished` export, while this route still imports it:

```text
src/app/api/publishing/assets/[assetId]/mark-published/route.ts
```

## Fix

This patch restores compatibility exports while keeping the newer lifecycle helpers.

## File Included

```text
src/lib/assets/asset-lifecycle.ts
```

## Exports Restored / Preserved

```text
rootAssetId
archiveSiblingAssetVersions
activateAssetVersion
supersedeAssetVersion
prepareNewAssetVersion
activateNewAssetVersion
markAssetPublished
markAssetSentToZapier
archiveWorkingAsset
```

## Apply

Replace:

```text
src/lib/assets/asset-lifecycle.ts
```

with the file in this package.

Suggested commit message:

```text
Restore asset lifecycle compatibility exports
```

## Why This Is Safer

This avoids forcing every older route to be updated immediately.

Both of these can now build:

```text
mark-published route using markAssetPublished
send-to-zapier route using markAssetSentToZapier
```
