# VIP Zapier MCP selected_api Fix

## Error fixed

```text
MCP error -32602: Input validation error: Invalid arguments for tool execute_zapier_write_action: selected_api expected string, received undefined
```

## What changed

Zapier MCP's generic write executor requires an internal `selected_api` value in addition to the visible app/action values.

The app was already fixed to send:

```json
{
  "app": "LinkedIn",
  "action": "create_company_update"
}
```

This patch adds the missing internal selector:

```json
{
  "selected_api": "LinkedInCLIAPI",
  "app": "LinkedIn",
  "action": "create_company_update"
}
```

## Files replaced

```text
src/lib/mcp/mcp-write-clients.ts
src/lib/zapier/mcp-write-client.ts
src/lib/publishing/output-payload.ts
src/lib/publishing/asset-routing.ts
```

## Why both MCP clients are patched

The repo has two Zapier MCP write clients:

```text
src/lib/mcp/mcp-write-clients.ts
src/lib/zapier/mcp-write-client.ts
```

The current error came from the first one, but both now send `selected_api` so the older publish route does not fail later.

## Vercel env variables

Keep these:

```text
ZAPIER_MCP_LINKEDIN_POST_ACTION=create_company_update
ZAPIER_LINKEDIN_MCP_TOOL_NAME=execute_zapier_write_action
```

Optional overrides:

```text
ZAPIER_LINKEDIN_SELECTED_API=LinkedInCLIAPI
ZAPIER_FACEBOOK_SELECTED_API=FacebookV2CLIAPI
ZAPIER_GMAIL_SELECTED_API=GoogleMailV2CLIAPI
ZAPIER_WORDPRESS_SELECTED_API=WordPressCLIAPI
```

If you know the actual LinkedIn organization/page ID, set one of these:

```text
ZAPIER_LINKEDIN_ORGANIZATION_ID=<your LinkedIn organization id>
LINKEDIN_COMPANY_PAGE_ID=<your LinkedIn organization id>
ZAPIER_LINKEDIN_COMPANY_ID=<your LinkedIn organization id>
```

## Expected next result

After deploy, the old `selected_api` validation error should be gone.

If Zapier then reports a different error, it should be the next real LinkedIn field/auth/company-page issue rather than the MCP wrapper failing before execution.
