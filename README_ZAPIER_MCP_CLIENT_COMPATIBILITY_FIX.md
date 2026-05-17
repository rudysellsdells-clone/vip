# Zapier MCP Client Compatibility Fix

## Problem

Vercel failed with:

```text
Export executeZapierMcpWriteAction doesn't exist in target module
```

The LinkedIn execution patch updated:

```text
src/lib/zapier/mcp-client.ts
```

to use the newer generic function:

```text
callZapierMcpTool
```

But an older route still imports:

```text
executeZapierMcpWriteAction
```

Specifically:

```text
src/app/api/zapier/gmail-draft/execute/route.ts
```

## Fix

This patch restores the missing export while keeping the newer generic MCP client.

Updated file:

```text
src/lib/zapier/mcp-client.ts
```

It now exports both:

```ts
callZapierMcpTool
executeZapierMcpWriteAction
```

## Why This Is Safe

`executeZapierMcpWriteAction` is now a compatibility wrapper.

It accepts the older route's legacy option shape, resolves the Zapier MCP tool name and args, then calls the shared JSON-RPC function.

This keeps:

- Gmail draft execution
- Facebook execution
- LinkedIn execution

on the same MCP client foundation.

## Apply

1. Replace:

```text
src/lib/zapier/mcp-client.ts
```

2. Commit.
3. Push.
4. Let Vercel rebuild.

Suggested commit message:

```text
Restore Zapier MCP compatibility export
```
