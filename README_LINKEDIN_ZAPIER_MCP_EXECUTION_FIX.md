# LinkedIn Zapier MCP Execution Fix

## Problem

The LinkedIn post is making it to the database, but it is not flowing into Zapier MCP.

That means the **prepare** step is working:

```text
approved LinkedIn asset → tool_runs row
```

But the **execute** step is missing or does not recognize LinkedIn.

## What This Patch Fixes

This adds a generic Zapier MCP execution layer that supports:

```text
Gmail draft
Facebook page post
LinkedIn company page post
```

It also adds an execute button on the Actions page for prepared/failed Zapier tool runs.

## New Files

```text
src/lib/zapier/mcp-client.ts
src/lib/zapier/action-registry.ts
src/lib/utils/json.ts
src/app/api/tool-runs/[toolRunId]/execute/route.ts
src/components/actions/ExecuteToolRunButton.tsx
```

## Updated Files

```text
src/app/(app)/actions/page.tsx
.env.example
```

## How It Works

Prepared LinkedIn rows should already look like this:

```text
provider = zapier_mcp
action_name = LinkedIn company page post
status = waiting_approval
input.policyKey = linkedin_create_company_update
```

Now, when you go to:

```text
/actions
```

VIP shows a button:

```text
Send to LinkedIn MCP
```

Clicking that calls:

```text
POST /api/tool-runs/[toolRunId]/execute
```

The executor:

1. Loads the tool run
2. Confirms ownership
3. Confirms provider is `zapier_mcp`
4. Detects LinkedIn from `input.policyKey`
5. Resolves the Zapier MCP tool name
6. Calls Zapier MCP using JSON-RPC `tools/call`
7. Updates `tool_runs.status` to `completed` or `failed`
8. Stores the Zapier output/error
9. Updates the source asset to `published` when successful
10. Logs activity

## Important Environment Variables

You already have:

```bash
ZAPIER_MCP_SERVER_URL=
```

If your MCP URL is already tokenized, that may be enough.

If it is not tokenized, add:

```bash
ZAPIER_MCP_TOKEN=
```

For LinkedIn, add:

```bash
ZAPIER_LINKEDIN_MCP_TOOL_NAME=linkedin_create_company_update
ZAPIER_LINKEDIN_PAGE_NAME="McCormick Web Marketing"
```

If Zapier's actual LinkedIn tool name is different, update:

```bash
ZAPIER_LINKEDIN_MCP_TOOL_NAME=
```

to match the exact MCP tool name Zapier exposes.

## Test Plan

1. Deploy this patch.
2. Open `/actions`.
3. Find the LinkedIn company page post tool run.
4. Confirm status is `waiting_approval` or `failed`.
5. Click **Send to LinkedIn MCP**.
6. Check Zapier MCP history.
7. Confirm the tool run status becomes:
   - `completed` if Zapier succeeds
   - `failed` with an error message if Zapier rejects the request

## If It Still Does Not Hit Zapier

Check the tool run error.

Likely causes:

### Wrong MCP URL

The error may say HTML was returned instead of JSON.

Fix:

```bash
ZAPIER_MCP_SERVER_URL=
```

Use the tokenized MCP URL from Zapier or add `ZAPIER_MCP_TOKEN`.

### Wrong LinkedIn tool name

Fix:

```bash
ZAPIER_LINKEDIN_MCP_TOOL_NAME=
```

Set it to the exact static LinkedIn tool name in the Zapier MCP server.

### LinkedIn company page permission

Zapier must have permission to post to:

```text
McCormick Web Marketing
```

If Zapier asks for an organization ID, set:

```bash
ZAPIER_LINKEDIN_ORGANIZATION_ID=
```

## Suggested Commit Message

```text
Execute LinkedIn posts through Zapier MCP
```
