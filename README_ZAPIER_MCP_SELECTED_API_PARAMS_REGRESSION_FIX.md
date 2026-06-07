# VIP Zapier MCP selected_api + params Regression Fix

## What this fixes

VIP showed this error when publishing a LinkedIn post:

```text
MCP error -32602: Input validation error: Invalid arguments for tool execute_zapier_write_action:
[
  {
    "path": ["selected_api"],
    "message": "Invalid input: expected string, received undefined"
  },
  {
    "path": ["params"],
    "message": "Invalid input: expected record, received undefined"
  }
]
```

## Cause

One of VIP's Zapier compatibility paths was building arguments for the generic Zapier MCP tool:

```text
execute_zapier_write_action
```

but only included:

```text
app
action
instructions
output
```

It did not include:

```text
selected_api
params
```

Zapier MCP requires both.

## Files included

```text
src/lib/zapier/action-registry.ts
src/lib/zapier/mcp-write-client.ts
src/lib/mcp/mcp-write-clients.ts
```

## What changed

### action-registry.ts

When using the generic executor `execute_zapier_write_action`, VIP now includes:

```ts
selected_api
params
```

alongside:

```ts
app
action
instructions
output
```

For LinkedIn, it defaults to:

```text
LinkedInCLIAPI
```

### write clients

Both MCP write clients now defensively add `selected_api` based on the app:

```text
LinkedIn -> LinkedInCLIAPI
Facebook -> FacebookV2CLIAPI
Gmail -> GoogleMailV2CLIAPI
WordPress -> WordPressCLIAPI
```

They also guarantee `params` is always a record/object.

## Expected result

A LinkedIn publish should now send arguments shaped like:

```json
{
  "selected_api": "LinkedInCLIAPI",
  "app": "LinkedIn",
  "action": "create_company_update",
  "instructions": "...",
  "params": {
    "comment": "...",
    "message": "...",
    "content": "..."
  },
  "output": "..."
}
```

## Suggested commit message

```text
Restore Zapier MCP selected_api and params arguments
```
