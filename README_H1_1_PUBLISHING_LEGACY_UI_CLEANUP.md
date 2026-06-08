# H1.1 Publishing Legacy UI Cleanup

## Purpose

This patch starts the publishing consolidation work without deleting legacy routes.

It removes the remaining visible UI call to the old `/send-to-zapier` webhook route and makes that legacy route explicitly reject LinkedIn/Facebook social posts.

## Why this matters

VIP had multiple publishing lanes. That caused false positives such as:

- VIP saying a run completed when Zapier MCP was not actually reached
- LinkedIn/Facebook using different execution paths
- old webhook behavior competing with Zapier MCP behavior

## Files changed

```text
src/components/publishing/PublishingScheduleActions.tsx
src/app/api/publishing/assets/[assetId]/send-to-zapier/route.ts
docs/PUBLISHING_ROUTE_CLASSIFICATION.md
README_H1_1_PUBLISHING_LEGACY_UI_CLEANUP.md
```

## Runtime behavior change

### PublishingScheduleActions.tsx

The visible action button now calls:

```text
/api/publishing/assets/[assetId]/execute-zapier-mcp
```

instead of:

```text
/api/publishing/assets/[assetId]/send-to-zapier
```

The button label is now:

```text
Publish via ZapierMCP
```

### send-to-zapier route

The legacy route still exists.

For `linkedin_post` and `facebook_post`, it now returns:

```text
410 Gone
```

with a message directing the caller to:

```text
/api/publishing/assets/[assetId]/execute-zapier-mcp
```

For non-social assets, the route remains available for backward compatibility, but the response includes a deprecation warning.

## Database impact

No migration.

## Risk level

Low-to-medium.

This does not delete any route, but it does intentionally block old webhook execution for LinkedIn/Facebook social assets.

## Test plan

1. Deploy through Vercel.
2. Open a scheduled approved LinkedIn asset.
3. Confirm the visible button says `Publish via ZapierMCP`.
4. Publish the asset.
5. Confirm Zapier MCP history shows an execution.
6. Confirm the asset is marked sent/published only after MCP success evidence.
7. Repeat with Facebook.
8. Directly calling `/send-to-zapier` for a social asset should return HTTP 410.

## Suggested commit message

```text
Deprecate legacy social Zapier webhook path
```
