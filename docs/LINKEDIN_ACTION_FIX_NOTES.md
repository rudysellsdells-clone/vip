# LinkedIn Zapier MCP Action Fix

## Problem

VIP was building this LinkedIn Zapier MCP payload:

```json
{
  "app": "LinkedIn",
  "action": "execute_zapier_write_action"
}
```

That is invalid because `execute_zapier_write_action` is the Zapier MCP tool/executor name, not the LinkedIn app action key.

## Fix

The patched file is:

```text
src/lib/publishing/output-payload.ts
```

The LinkedIn action now resolves to a real LinkedIn app action key:

```text
create_company_update
```

The MCP tool/executor remains:

```text
execute_zapier_write_action
```

## Correct Vercel environment variables

Recommended:

```text
ZAPIER_LINKEDIN_MCP_TOOL_NAME=execute_zapier_write_action
ZAPIER_MCP_LINKEDIN_POST_ACTION=create_company_update
```

Optional alternative:

```text
ZAPIER_LINKEDIN_ACTION_KEY=create_company_update
```

Do not use `execute_zapier_write_action` as any LinkedIn action-key variable.

## Expected payload preview after fix

```json
{
  "app": "LinkedIn",
  "action": "create_company_update"
}
```

## Also hardened

The same file now ignores executor names when choosing social app action keys, so `execute_zapier_write_action` will not be used as a social post action if it appears in a legacy environment variable.
