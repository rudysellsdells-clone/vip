# Zapier MCP Accept Header Fix

## Problem

LinkedIn Zapier MCP execution fails with:

```text
Zapier MCP request failed: 406 Not Acceptable — {"jsonrpc":"2.0","error":{"code":-32000,"message":"Not Acceptable: Client must accept both application/json and text/event-stream"},"id":null}
```

## Cause

Zapier MCP requires the client to send an `Accept` header that allows both:

```text
application/json
text/event-stream
```

The previous MCP client only sent:

```text
Content-Type: application/json
```

## Fix

Updated:

```text
src/lib/zapier/mcp-client.ts
```

The MCP request now sends:

```ts
Accept: "application/json, text/event-stream"
```

It also adds basic server-sent event parsing in case Zapier responds as:

```text
event: message
data: {"jsonrpc":"2.0", ...}
```

## Why This Is Safe

This keeps the previous compatibility export:

```ts
executeZapierMcpWriteAction
```

and the newer generic function:

```ts
callZapierMcpTool
```

So it should continue supporting:

- Gmail drafts
- Facebook page posts
- LinkedIn company page posts

## Apply

1. Replace:

```text
src/lib/zapier/mcp-client.ts
```

2. Commit.
3. Push.
4. Redeploy Vercel.

Suggested commit message:

```text
Fix Zapier MCP Accept header
```

## Test

1. Open `/actions`.
2. Find the LinkedIn company page post tool run.
3. Click **Send to LinkedIn MCP**.
4. Confirm the 406 error is gone.
5. If it fails again, the next error should be from Zapier tool configuration, permissions, or tool name resolution rather than the HTTP Accept header.
