# VIP Controlled ZapierMCP Execution Path — Repo Root Extract Package

## Important

This ZIP is packaged so you can extract it directly into the repository root.

It does **not** contain a wrapper folder.

After extraction, the files should land directly at paths like:

```text
src/lib/publishing/output-payload.ts
src/app/(app)/publishing-ready/page.tsx
```

Not:

```text
vip-controlled-zapier-mcp-execution-path/src/...
```

## Files Included

```text
src/lib/publishing/output-payload.ts
src/lib/mcp/mcp-write-clients.ts
src/lib/assets/asset-lifecycle.ts
src/app/api/publishing/assets/[assetId]/execute-zapier-mcp/route.ts
src/components/publishing/SendAssetToZapierMcpButton.tsx
src/app/(app)/publishing-ready/page.tsx
README_EXTRACT_DIRECTLY_TO_REPO_ROOT.md
```

## Purpose

This creates one controlled ZapierMCP execution path:

```text
/publishing-ready?asset=[assetId]
```

and one API route:

```text
/api/publishing/assets/[assetId]/execute-zapier-mcp
```

## Required Vercel Environment Variables

```text
ZAPIER_MCP_SERVER_URL
ZAPIER_MCP_DEFAULT_APP
ZAPIER_MCP_DEFAULT_ACTION
```

Optional:

```text
ZAPIER_MCP_TOKEN
```

Asset-specific optional mappings:

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

## Commit Message

```text
Add controlled ZapierMCP execution path
```

## Test

1. Deploy.
2. Open an approved active asset at:

```text
/publishing-ready?asset=[assetId]
```

3. Confirm the payload preview shows `params`.
4. Click Send to ZapierMCP.
5. Confirm success or a readable configuration error.
