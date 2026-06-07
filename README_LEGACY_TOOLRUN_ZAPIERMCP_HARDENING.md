# VIP Legacy Tool Run Zapier MCP Hardening Patch

## What this fixes

LinkedIn did not publish, but VIP/tool-runs appeared to complete or showed an MCP error in output.

The tool run payload showed:

```json
{
  "toolName": "execute_zapier_write_action",
  "toolArgs": {
    "app": "LinkedIn",
    "action": "create_company_update",
    "instructions": "... comment and company_id were only inside instructions ..."
  }
}
```

Zapier MCP requires the generic executor arguments to include:

```json
{
  "selected_api": "LinkedInCLIAPI",
  "params": {
    "comment": "...",
    "company_id": "..."
  }
}
```

The values cannot live only inside the instruction text.

## Files included

```text
src/lib/zapier/action-registry.ts
src/lib/zapier/mcp-client.ts
src/app/api/tool-runs/[toolRunId]/execute/route.ts
```

## What changed

### 1. action-registry.ts

For generic Zapier MCP executor tools, VIP now returns:

```text
selected_api
app
action
instructions
params
output
```

It also falls back to known top-level fields for LinkedIn, Facebook, and Gmail if `input.params` is missing.

### 2. mcp-client.ts

The MCP client now defensively normalizes generic executor args and ensures:

```text
selected_api exists
params is at least an object
```

It also detects MCP error text returned inside tool content even when the response wrapper does not set `isError: true`.

### 3. tool-runs execute route

Before calling Zapier MCP, the route now validates that generic executor runs include:

```text
selected_api
non-empty params object
```

If not, it marks the tool run failed instead of pretending it completed.

It also blocks completion if the returned tool result contains MCP error text.

## Expected result

A LinkedIn tool run should now either:

1. Send a real Zapier MCP call with `params.comment` and `params.company_id`, or
2. Fail clearly before calling Zapier if params were not structured correctly.

It should not mark a LinkedIn run complete when Zapier returned an MCP validation error.

## Suggested commit message

```text
Harden legacy Zapier MCP tool run execution
```
