# VIP Controlled ZapierMCP Execution Path

## Goal

Stop chasing multiple publishing paths.

This patch creates one controlled path for sending an approved asset to ZapierMCP.

## Product Rule

VIP should manage its own outputs.

The flow should be:

```text
approved active latest asset
→ publishing-ready execution screen
→ structured params payload
→ ZapierMCP write action
→ mark asset sent
→ remove from publishing queue
→ show in history/activity
```

## Files Included

```text
src/lib/publishing/output-payload.ts
src/app/api/publishing/assets/[assetId]/execute-zapier-mcp/route.ts
src/components/publishing/SendAssetToZapierMcpButton.tsx
src/app/(app)/publishing-ready/page.tsx
README_CONTROLLED_ZAPIER_MCP_EXECUTION_PATH.md
```

## What This Fixes

### 1. One controlled execution route

```text
POST /api/publishing/assets/[assetId]/execute-zapier-mcp
```

### 2. One controlled execution page

```text
/publishing-ready?asset=[assetId]
```

### 3. Payload preview

The page shows the exact `params` object before sending.

This directly addresses the error:

```text
params expected record, received undefined
```

### 4. Asset eligibility check

Only assets that are:

```text
approved
active latest version
not archived
not superseded
```

can be sent.

## Environment Variables

Required:

```text
ZAPIER_MCP_SERVER_URL
```

Optional:

```text
ZAPIER_MCP_TOKEN
```

Default action mapping:

```text
ZAPIER_MCP_DEFAULT_APP
ZAPIER_MCP_DEFAULT_ACTION
```

Asset-specific mapping:

```text
ZAPIER_MCP_LINKEDIN_POST_APP
ZAPIER_MCP_LINKEDIN_POST_ACTION
ZAPIER_MCP_FACEBOOK_POST_APP
ZAPIER_MCP_FACEBOOK_POST_ACTION
ZAPIER_MCP_BLOG_POST_APP
ZAPIER_MCP_BLOG_POST_ACTION
ZAPIER_MCP_EMAIL_APP
ZAPIER_MCP_EMAIL_ACTION
ZAPIER_MCP_VIDEO_SCRIPT_APP
ZAPIER_MCP_VIDEO_SCRIPT_ACTION
```

## Apply

1. Add/replace the included files.
2. Make sure the hardened `src/lib/mcp/mcp-write-clients.ts` from the prior patch is installed.
3. Ensure `src/lib/assets/asset-lifecycle.ts` has `markAssetSentToZapier`.
4. Deploy.
5. Open:

```text
/publishing-ready?asset=[assetId]
```

6. Confirm the payload preview includes a populated params object.
7. Click Send to ZapierMCP.

## Suggested Commit Message

```text
Add controlled ZapierMCP execution path
```

## Test Acceptance Criteria

```text
Publishing-ready page loads one approved asset
Payload preview shows title/content/asset type
Send button calls one API route
API route sends params object to ZapierMCP
Success marks asset sent/published
Sent asset leaves publishing schedule
Activity log records the send
Error message is readable if config/action fails
```
