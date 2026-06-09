# VIP H1.2B Publishing Preflight Service Patch

## Purpose

This patch continues H1.2 by moving publishing preflight rules into the shared publishing execution service.

H1.2 created the service boundary. H1.2B moves a second safe slice into that boundary: asset readiness and destination validation.

## Files included

```text
src/lib/publishing/publishing-execution-service.ts
src/app/api/publishing/assets/[assetId]/execute-zapier-mcp/route.ts
docs/H1_2B_PUBLISHING_PREFLIGHT_SERVICE.md
docs/PUBLISHING_REPUBLISH_LIFECYCLE_NOTE.md
README_H1_2B_PUBLISHING_PREFLIGHT_SERVICE.md
```

## What moved into the service

The publishing service now owns:

```text
publishingAssetState
publishingPreflightForAsset
isLinkedInPostAsset
validatePublishingDestination
```

That means the route no longer owns the duplicate-publishing check, approved/latest/active check, or LinkedIn destination-lock validation.

## What did not change

This patch does not change:

- ZapierMCP payloads
- provider calls
- result guard behavior
- asset status update behavior
- UI behavior
- database schema
- RLS
- GalaxyAI behavior

## Known lifecycle loophole documented

A published asset can currently be republished indirectly by requesting a revision, approving the revision, and publishing the new active version.

That is documented as a lifecycle policy issue, not fixed here.

## Test checklist

After deploy:

1. Publish one LinkedIn post.
2. Create one Gmail draft.
3. Publish one Facebook post.
4. Confirm already-published assets still block direct republishing.
5. Confirm LinkedIn still blocks if the real organization ID is missing.

## Suggested commit message

```text
Move publishing preflight checks into execution service
```
