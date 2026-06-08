# VIP Publishing Execution Standard

## Purpose

VIP publishing has accumulated multiple execution paths. This standard prevents future features from adding more paths and defines how publishing should behave.

## Current known paths

### Canonical social route

```text
src/app/api/publishing/assets/[assetId]/execute-zapier-mcp/route.ts
```

Use this for LinkedIn/Facebook social publishing unless a new consolidated service replaces it.

### Legacy/compatibility paths

```text
src/app/api/publishing/assets/[assetId]/execute/route.ts
src/app/api/publishing/assets/[assetId]/send-to-zapier/route.ts
src/app/api/tool-runs/[toolRunId]/execute/route.ts
src/app/api/zapier/facebook-post/execute/route.ts
src/app/api/zapier/gmail-draft/execute/route.ts
```

These should not be expanded. They should either delegate to the canonical service or be deprecated after testing.

## Target architecture

Create one execution service:

```text
src/lib/publishing/publishing-execution-service.ts
```

Responsibilities:

```text
Load asset
Validate account/user access
Validate asset is executable
Resolve route/provider/channel/action
Build payload
Call provider
Normalize response
Write execution run
Write activity log
Update asset status only when success evidence exists
Return clear UI-safe result
```

## Required Zapier MCP shape

Generic MCP executor calls must include:

```json
{
  "selected_api": "LinkedInCLIAPI",
  "app": "LinkedIn",
  "action": "create_company_update",
  "instructions": "...",
  "params": {
    "comment": "...",
    "company_id": "..."
  },
  "output": "..."
}
```

## Do not do this

```json
{
  "app": "LinkedIn",
  "action": "create_company_update",
  "instructions": "Use comment: ..."
}
```

That will fail because `params` is missing.

## Success evidence

Treat these as success signals when they are returned by the provider:

```text
results.id
results.record_id
results.url
status = PUBLISHED
Record created successfully
provider post URL
provider execution id plus success status
```

Do not mark completed when:

```text
MCP error appears in result text
Input validation error appears in result text
Zapier asks for more information without a provider record id
Local route succeeds but provider was not called
```

## Recommended states

```text
prepared = VIP built a provider request
sent_to_provider = request was sent
completed = provider returned success evidence
failed = provider returned or threw an error
skipped = duplicate/prevented/no-op
needs_attention = provider response was ambiguous
```

If the current database enum does not include `needs_attention`, use `failed` with a clear error until the enum is updated.
