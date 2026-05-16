# Sprint 5.4 Execution Results, Asset Status, and Audit Trail

## Goal

Make VIP's execution layer auditable, traceable, and easier to scale before adding more public channels.

## Why This Sprint

VIP can now execute real external actions:

- Gmail draft creation
- Facebook Page locked publishing

Sprint 5.4 improves how VIP records, displays, and audits those actions.

## What This Adds

### 1. Normalized Zapier results

Adds:

```text
src/lib/zapier/result-utils.ts
```

This normalizes Zapier MCP responses into:

```json
{
  "success": true,
  "isError": false,
  "summary": "Zapier completed successfully. External ID: ...",
  "externalId": "...",
  "externalUrl": null
}
```

It also detects nested Zapier tool errors where `isError = true`.

### 2. Execution audit helper

Adds:

```text
src/lib/zapier/execution-audit.ts
```

This helper:

- Finds the source asset from `tool_runs.input`
- Adds execution metadata to the source asset
- Stores `lastZapierExecution`
- Appends to `zapierExecutions`
- Updates Facebook source assets to `published` after successful posting

### 3. Updated MCP client

Updates:

```text
src/lib/zapier/mcp-client.ts
```

The client now fails when Zapier returns a nested error instead of treating it as completed.

### 4. Updated Gmail execution route

Updates:

```text
src/app/api/zapier/gmail-draft/execute/route.ts
```

Gmail output now saves:

```json
{
  "normalizedResult": {},
  "rawResult": {}
}
```

The source asset receives a metadata trail but keeps status `approved` because creating a draft is not the same as sending.

### 5. Updated Facebook execution route

Updates:

```text
src/app/api/zapier/facebook-post/execute/route.ts
```

Facebook output now saves:

```json
{
  "normalizedResult": {},
  "rawResult": {}
}
```

The source Facebook asset is updated to:

```text
published
```

after successful posting.

### 6. Better `/zapier` page

Updates:

```text
src/app/(app)/zapier/page.tsx
```

The page now shows:

- Waiting action count
- Completed action count
- Failed action count
- Facebook lock status
- Source asset details
- Prepared action JSON in a collapsible section
- External ID
- External URL when available
- Clean error display

### 7. New `/actions` audit page

Adds:

```text
src/app/(app)/actions/page.tsx
```

This is a simple action history page showing recent tool runs across providers.

## Files Included

```text
src/lib/zapier/result-utils.ts
src/lib/zapier/mcp-client.ts
src/lib/zapier/execution-audit.ts
src/app/api/zapier/gmail-draft/execute/route.ts
src/app/api/zapier/facebook-post/execute/route.ts
src/app/(app)/zapier/page.tsx
src/app/(app)/actions/page.tsx
```

## Apply

1. Copy the files into the repo.
2. Commit.
3. Push.
4. Let Vercel redeploy.

Suggested commit message:

```text
Add execution results and audit trail
```

## Test

### Gmail

1. Approve an email asset.
2. Prepare Zapier action.
3. Create Gmail draft.
4. Confirm `tool_runs.output.normalizedResult` exists.
5. Confirm source asset metadata has `lastZapierExecution`.

### Facebook

1. Approve a Facebook post asset.
2. Prepare Zapier action.
3. Publish to locked Facebook Page.
4. Confirm `tool_runs.output.normalizedResult.externalId` exists.
5. Confirm source asset status becomes `published`.
6. Confirm source asset metadata has `lastZapierExecution`.

### Audit UI

1. Visit `/zapier`.
2. Confirm cleaner status and result display.
3. Visit `/actions`.
4. Confirm action history appears.

## No Database Migration Needed

This sprint uses the existing tables:

```text
tool_runs
generated_assets
activity_log
```

No schema change is required.
