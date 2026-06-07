# VIP Publishing Stabilization + Canonical ZapierMCP Patch

## Purpose

This patch stabilizes the current LinkedIn/Facebook/Gmail publishing test results without deleting legacy routes yet.

It does four things:

1. Forces LinkedIn and Facebook button execution through the canonical ZapierMCP route.
2. Fixes the Publishing Ready link so it includes the asset id.
3. Stops the Publishing Ready page from showing a scary "not approved" message after an asset has already been sent/published.
4. Restores durable Zapier MCP argument handling for `selected_api` and `params`, including Gmail defaults.

## Files included

```text
src/components/publishing/ExecuteApprovedAssetButton.tsx
src/components/ready-for-publishing/ReadyAssetActions.tsx
src/app/(app)/publishing-ready/page.tsx
src/lib/publishing/asset-routing.ts
src/lib/zapier/action-registry.ts
src/lib/zapier/mcp-write-client.ts
src/lib/mcp/mcp-write-clients.ts
```

## Key behavior changes

### LinkedIn/Facebook

The general execution button now calls:

```text
/api/publishing/assets/[assetId]/execute-zapier-mcp
```

for:

```text
linkedin_post
facebook_post
```

This avoids the older generic execution path that could mark a run complete without the expected MCP evidence.

### Ready for Publishing link

The old link pointed to:

```text
/publishing-ready
```

but that page requires an asset query param. It now links to:

```text
/publishing-ready?asset=[assetId]
```

### Already sent/published message

If Facebook successfully posts and VIP marks the asset as sent/published, the page now says:

```text
Already sent or published
```

instead of:

```text
This asset is not approved, active, and latest-version. It cannot be sent yet.
```

### Gmail

Gmail remains on the generic `/execute` route because it needs a recipient field. The patch improves defaults and sends the proper Zapier MCP app name/action default:

```text
App: Gmail
Action: create_draft
selected_api: GoogleMailV2CLIAPI
```

## What this does NOT do

It does not delete old routes yet. This is a deprecation/stabilization pass, not a destructive cleanup.

## Test checklist

1. Open an approved LinkedIn post and click the publish/execute button.
2. Confirm Zapier MCP history receives an execution.
3. Confirm LinkedIn posts and VIP marks it sent.
4. Open an approved Facebook post and publish.
5. Confirm Facebook posts and VIP shows already sent/published instead of the old warning.
6. Open an approved email asset from the asset detail page.
7. Enter a recipient email and create a Gmail draft.
8. Confirm Zapier MCP history receives the Gmail execution.

## Suggested commit message

```text
Stabilize publishing routes and ZapierMCP execution
```
