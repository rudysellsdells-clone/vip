# VIP LinkedIn Company Update Params + MCP Error Fix

This patch is based on the uploaded VIP repo ZIP.

## What changed

### 1. `src/lib/publishing/output-payload.ts`

LinkedIn now uses the correct action key:

```ts
create_company_update
```

and no longer falls back to the MCP tool name for the action.

It also sends LinkedIn Company Update fields:

```ts
company_id
company
organization_id
comment
```

while keeping the old aliases:

```ts
text
content
message
linkedin_page_name
```

This matters because Zapier's LinkedIn `create_company_update` action expects the company/page selector and post body fields, not just generic `text` and `content`.

### 2. `src/lib/mcp/mcp-write-clients.ts`

Stops hiding Zapier's real plain-text MCP error behind:

```text
Unexpected token 'M', "MCP error "... is not valid JSON
```

### 3. `src/lib/zapier/mcp-write-client.ts`

Same error-handling improvement for the older publishing route/client.

## Required Vercel env vars

Recommended:

```text
ZAPIER_MCP_LINKEDIN_POST_ACTION=create_company_update
ZAPIER_LINKEDIN_MCP_TOOL_NAME=execute_zapier_write_action
ZAPIER_LINKEDIN_PAGE_NAME=McCormick Web Marketing
```

If you have the numeric LinkedIn company/organization id, set one of these:

```text
ZAPIER_LINKEDIN_ORGANIZATION_ID=<your LinkedIn company/page id>
LINKEDIN_COMPANY_PAGE_ID=<your LinkedIn company/page id>
ZAPIER_LINKEDIN_COMPANY_ID=<your LinkedIn company/page id>
```

The patch will fall back to `ZAPIER_LINKEDIN_PAGE_NAME` if no id is set, but the numeric/page selector id may be required depending on the Zapier action schema.

## Apply

Copy these files into your repo, replacing the existing files:

```text
src/lib/publishing/output-payload.ts
src/lib/mcp/mcp-write-clients.ts
src/lib/zapier/mcp-write-client.ts
```

Commit and push. Vercel will rebuild.

## Expected behavior

The next failure, if any, should show the actual Zapier MCP error message instead of the JSON parse error.
