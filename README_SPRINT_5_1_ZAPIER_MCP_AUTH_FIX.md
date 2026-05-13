# Sprint 5.1 Zapier MCP Auth Fix

## Issue

Creating a Gmail draft failed with:

```text
Zapier MCP request failed: 401 Unauthorized
Missing authorization header or token query parameter
```

## Meaning

VIP reached the Zapier MCP server, but the server rejected the request because it did not include authentication.

## Fix Options

### Option A — Use full MCP server URL with token

If Zapier gives you a server URL that already includes a token query parameter, use the full URL as:

```bash
ZAPIER_MCP_SERVER_URL=https://mcp.zapier.com/...?...token=...
```

Do not remove the query string.

### Option B — Use separate auth token

If Zapier gives you a server URL and token separately, use:

```bash
ZAPIER_MCP_SERVER_URL=https://mcp.zapier.com/...
ZAPIER_MCP_AUTH_TOKEN=your_token_here
```

## What This Patch Adds

This patch updates:

```text
src/lib/zapier/mcp-client.ts
```

It now supports the optional server-side variable:

```bash
ZAPIER_MCP_AUTH_TOKEN=
```

When present, VIP sends:

```text
Authorization: Bearer <token>
```

## Apply

1. Replace `src/lib/zapier/mcp-client.ts`.
2. Add `ZAPIER_MCP_AUTH_TOKEN` in Vercel if needed.
3. Commit.
4. Push.
5. Redeploy.

Suggested commit message:

```text
Add Zapier MCP authorization support
```

## Important

Do not prefix the token with `NEXT_PUBLIC_`.

Do not paste the token into chat.

## Test

1. Go to `/zapier`.
2. Find the prepared Gmail draft action.
3. Click **Create Gmail Draft**.
4. Confirm status changes to `completed`.
5. Check Gmail Drafts.
