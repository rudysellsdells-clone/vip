# VIP MCP Write Clients Params Hardening

## Why This Patch Exists

Zapier MCP returned:

```text
MCP error -32602:
Invalid arguments for tool execute_zapier_write_action
path ["params"]
expected record, received undefined
```

The pasted `mcp-write-clients.ts` already had:

```ts
params = {}
```

inside the function signature, which means if that exact helper is used in production, `params` should not be undefined.

So the likely causes are:

```text
an older deployed version is still running
another execution path bypasses this helper
another function rebuilds the MCP payload after this helper
a caller passes a non-record value and it reaches MCP unchanged
```

## What This File Changes

This replacement keeps backward compatibility but hardens the runtime payload.

It adds:

```text
asRecord()
cleanRecord()
requiredString()
buildZapierWriteArguments()
```

And guarantees the MCP tool receives:

```ts
arguments: {
  app,
  action,
  instructions,
  params: {},
  output
}
```

never:

```ts
params: undefined
```

## File Included

```text
src/lib/mcp/mcp-write-clients.ts
```

If your actual file lives somewhere else, copy this replacement into the matching file path.

## Apply

Replace the existing `mcp-write-clients.ts` with the included file.

Suggested commit message:

```text
Harden Zapier MCP write params
```

## Important Follow-Up

After deployment, if the same error continues, that proves the failing path is not using this helper.

Then search for:

```text
tools/call
execute_zapier_write_action
ZAPIER_MCP_SERVER_URL
```

because another file is building the MCP request body directly.
