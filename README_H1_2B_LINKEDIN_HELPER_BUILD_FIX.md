# VIP H1.2B LinkedIn Helper Build Fix

## What this fixes

Vercel failed with:

```text
Cannot find name 'isLikelyLinkedInOrganizationId'.
```

The H1.2B patch correctly moved LinkedIn destination validation into the publishing execution service, but the GET preview branch in:

```text
src/app/api/publishing/assets/[assetId]/execute-zapier-mcp/route.ts
```

still called the old helper directly.

## File replaced

```text
src/app/api/publishing/assets/[assetId]/execute-zapier-mcp/route.ts
```

## Change made

The GET preview now uses the service-level validator:

```ts
const destinationError = validatePublishingDestination({
  asset: assetForPublishing,
  params: paramsRecord,
});
```

Then derives:

```ts
linkedinDestinationLocked: isLinkedInPostAsset(assetForPublishing.asset_type)
  ? !destinationError
  : null,
linkedinDestinationError: destinationError || null,
```

This keeps H1.2B aligned with the new architecture: destination rules live in the publishing service, not the route.

## Runtime behavior

No publishing behavior changed.

This only fixes the TypeScript build error in the preview response.

## Suggested commit message

```text
Fix H1.2B LinkedIn destination preview helper reference
```
