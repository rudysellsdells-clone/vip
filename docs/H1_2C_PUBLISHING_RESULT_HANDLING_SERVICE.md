# H1.2C Publishing Result Handling Service

## Purpose

H1.2C continues the publishing consolidation started in H1.2 and H1.2B.

H1.1 stabilized the publishing path. H1.2 created the service boundary. H1.2B moved preflight checks into the service. H1.2C moves provider result handling, asset status updates, and publishing activity log writes into the service.

## Files changed

```text
src/lib/publishing/publishing-execution-service.ts
src/app/api/publishing/assets/[assetId]/execute-zapier-mcp/route.ts
```

## What moved into the service

The publishing service now owns:

1. Starting a ZapierMCP publishing execution run.
2. Writing the `asset_zapier_mcp_send_started` activity log.
3. Validating provider success evidence with the MCP result guard.
4. Completing the publishing execution run.
5. Marking the asset sent/published through the existing asset lifecycle helper.
6. Writing the `asset_sent_to_zapier_mcp` activity log.
7. Failing the publishing execution run.
8. Writing the `asset_zapier_mcp_send_failed` activity log.

## What stayed in the route

The route still owns:

1. Authentication.
2. Asset lookup.
3. Account publishing settings attachment.
4. Preflight call into the service.
5. ZapierMCP config lookup.
6. Payload building.
7. LinkedIn destination validation call into the service.
8. The actual ZapierMCP provider call.
9. HTTP response shaping.

## Why the actual ZapierMCP call stayed in the route

The provider call is intentionally left in the route for now. This keeps H1.2C conservative and reduces risk while LinkedIn, Gmail, and Facebook are known to be working.

A later H1.2 patch can move provider invocation into the service after this extraction is tested.

## Runtime behavior

Expected user-facing behavior should not change.

The canonical path remains:

```text
Approved asset
→ /api/publishing/assets/[assetId]/execute-zapier-mcp
→ structured params
→ ZapierMCP execution
→ provider success result
→ VIP completed status
```

## Out of scope

This patch does not:

- change ZapierMCP payloads
- change provider instructions
- change LinkedIn destination-lock behavior
- change Gmail draft-only behavior
- change Facebook publishing behavior
- delete legacy routes
- change database schema
- change RLS
- change UI

## Test checklist

After deploy:

1. LinkedIn publish still works and uses the correct organization ID.
2. Gmail still creates a draft only.
3. Facebook still publishes.
4. Successful provider responses mark the asset completed/sent.
5. Failed provider responses mark the execution failed.
6. `/actions` and `/zapier` still show execution history.

## Next recommended step

If H1.2C passes testing, the next step is H1.2D: move provider invocation or final route response normalization into the publishing service, while keeping the public behavior unchanged.
