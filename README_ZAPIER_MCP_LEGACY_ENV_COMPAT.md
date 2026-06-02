# VIP ZapierMCP Legacy Environment Compatibility

## Problem

The new controlled ZapierMCP execution path worked, but failed with:

```text
ZapierMCP is not configured for asset type: facebook_post
```

Your Vercel environment variables show that VIP already had earlier Zapier/MCP configuration, but the new controlled path was looking for newer env var names.

Existing relevant vars:

```text
ZAPIER_MCP_AUTH_TOKEN
ZAPIER_MCP_SERVER_URL
ZAPIER_WORDPRESS_CREATE_POST_ACTION_KEY
ZAPIER_GMAIL_APP
ZAPIER_GMAIL_CREATE_DRAFT_ACTION
ZAPIER_LINKEDIN_MCP_TOOL_NAME
ZAPIER_LINKEDIN_PAGE_NAME
ZAPIER_FACEBOOK_PAGE_NAME
ZAPIER_FACEBOOK_PAGE_ID
```

## What This Patch Does

It updates the controlled ZapierMCP path to read both:

```text
old/legacy env var names
new/asset-specific env var names
```

## Files Included

```text
src/lib/publishing/output-payload.ts
src/lib/mcp/mcp-write-clients.ts
src/app/api/publishing/zapier-mcp-config/route.ts
README_ZAPIER_MCP_LEGACY_ENV_COMPAT.md
```

## Compatibility Added

### Token

Reads either:

```text
ZAPIER_MCP_TOKEN
ZAPIER_MCP_AUTH_TOKEN
```

### WordPress

Reads:

```text
ZAPIER_MCP_BLOG_POST_ACTION
ZAPIER_WORDPRESS_CREATE_POST_ACTION_KEY
```

### Gmail / Email

Reads:

```text
ZAPIER_MCP_EMAIL_APP
ZAPIER_MCP_EMAIL_ACTION
ZAPIER_GMAIL_APP
ZAPIER_GMAIL_CREATE_DRAFT_ACTION
```

### LinkedIn

Reads:

```text
ZAPIER_MCP_LINKEDIN_POST_ACTION
ZAPIER_LINKEDIN_MCP_TOOL_NAME
ZAPIER_LINKEDIN_PAGE_NAME
```

### Facebook

Reads:

```text
ZAPIER_MCP_FACEBOOK_POST_ACTION
ZAPIER_FACEBOOK_MCP_TOOL_NAME
ZAPIER_FACEBOOK_PAGE_ID
ZAPIER_FACEBOOK_PAGE_NAME
```

## Important Facebook Note

Your env var list includes:

```text
ZAPIER_FACEBOOK_PAGE_NAME
ZAPIER_FACEBOOK_PAGE_ID
```

But it does **not** show a Facebook action key/tool name.

So Facebook still needs one of these:

```text
ZAPIER_FACEBOOK_MCP_TOOL_NAME
```

or

```text
ZAPIER_MCP_FACEBOOK_POST_ACTION
```

## Diagnostic Route Added

Open:

```text
/api/publishing/zapier-mcp-config
```

It shows which ZapierMCP env vars are present without revealing secrets.

## Apply

Extract this ZIP directly to repo root and redeploy.

Suggested commit message:

```text
Support legacy ZapierMCP environment variables
```
