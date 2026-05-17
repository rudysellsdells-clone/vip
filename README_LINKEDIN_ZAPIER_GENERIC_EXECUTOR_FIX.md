# LinkedIn Zapier Generic Executor Fix

## Problem

LinkedIn execution reaches Zapier MCP but fails with:

```text
MCP error -32602: Tool linkedin_create_company_update not found
```

## Cause

Zapier MCP action names are not the same thing as MCP tool names.

The enabled LinkedIn action is:

```text
app = LinkedIn
action key = create_company_update
```

But the MCP tool to call is:

```text
execute_zapier_write_action
```

VIP was trying to call a guessed static tool name:

```text
linkedin_create_company_update
```

That tool does not exist on the connected Zapier MCP server.

## Fix

This patch updates LinkedIn execution so VIP calls:

```text
tool name = execute_zapier_write_action
```

with arguments:

```json
{
  "app": "LinkedIn",
  "action": "create_company_update",
  "instructions": "...approved content and target company page...",
  "output": "Return the LinkedIn company update result..."
}
```

## Files Updated

```text
src/lib/zapier/action-registry.ts
src/lib/zapier/linkedin.ts
src/lib/zapier/mcp-client.ts
src/app/api/tool-runs/[toolRunId]/execute/route.ts
.env.example
```

## Vercel Environment Variable

Change this:

```bash
ZAPIER_LINKEDIN_MCP_TOOL_NAME=linkedin_create_company_update
```

to this:

```bash
ZAPIER_LINKEDIN_MCP_TOOL_NAME=execute_zapier_write_action
```

Keep:

```bash
ZAPIER_LINKEDIN_PAGE_NAME="McCormick Web Marketing"
```

## Important

Existing LinkedIn tool runs created before this patch may still have this in their input:

```json
"mcpToolName": "linkedin_create_company_update"
```

For the cleanest test, create a fresh LinkedIn prepared action after deploy:

1. Open the approved LinkedIn asset.
2. Click **Prepare LinkedIn Post** again.
3. Open `/actions`.
4. Click **Send to LinkedIn MCP**.

If you want to retry an old tool run, edit its `input.mcpToolName` in Supabase to:

```text
execute_zapier_write_action
```

or remove the `mcpToolName` field entirely.

## Suggested Commit Message

```text
Use generic Zapier executor for LinkedIn posts
```

## Test

1. Deploy this patch.
2. Confirm Vercel env:

```bash
ZAPIER_LINKEDIN_MCP_TOOL_NAME=execute_zapier_write_action
```

3. Prepare a fresh LinkedIn post action.
4. Go to `/actions`.
5. Click **Send to LinkedIn MCP**.
6. Confirm the old `Tool linkedin_create_company_update not found` error is gone.
