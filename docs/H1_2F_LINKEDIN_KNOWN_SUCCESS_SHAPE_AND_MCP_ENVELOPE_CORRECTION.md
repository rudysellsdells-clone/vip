# H1.2F LinkedIn Known Success Shape and MCP Envelope Correction

## Purpose

Correct the H1.2D/H1.2E publishing stabilization path using a real successful LinkedIn Zapier MCP response as the source of truth.

## What we learned

The last known-good LinkedIn publish returned this shape:

```json
{
  "0": {
    "id": "urn:li:share:...",
    "url": "https://www.linkedin.com/feed/update/urn:li:share:.../",
    "author": "urn:li:organization:1650652",
    "lifecycleState": "PUBLISHED"
  }
}
```

That is valid provider success evidence even though it does not use `results.record_id`.

## Problems fixed

1. H1.2D required provider evidence but did not yet recognize numeric-keyed LinkedIn success responses.
2. H1.2E's aggressive "EXECUTE NOW" envelope appears to trigger the MCP layer to answer as an AI assistant instead of using the Zapier executor.

## What changed

### `src/lib/publishing/mcp-result-guard.ts`

The guard now accepts:

```text
results.record_id
results.url
results.status = PUBLISHED
0.id
0.url
0.lifecycleState = PUBLISHED
array[0].id
array[0].url
array[0].lifecycleState = PUBLISHED
```

It still rejects:

```text
requestArguments
mcpRequestArguments
params
asset_id
campaign_id
company_id
public post text
followUpQuestion
preview/simulation responses
```

### `src/lib/mcp/mcp-write-clients.ts`

This file is restored to the pre-H1.2E behavior. The over-forceful execution envelope is removed because it produced MCP responses such as:

```text
I'm an AI assistant and cannot execute real API calls...
```

### `src/lib/publishing/publishing-execution-service.ts`

The service remains aligned with H1.2D and stores provider evidence on completed runs.

## Runtime impact

No database migration.
No route change.
No UI change.
No LinkedIn company ID change.
No payload-builder change.

## Test after deploy

1. Reset or use a fresh approved LinkedIn post.
2. Publish through VIP.
3. Confirm Zapier MCP returns a real provider result.
4. Confirm the guard accepts either `results.*` or numeric-keyed LinkedIn response shape.
5. Confirm VIP only marks completed when LinkedIn provider evidence exists.
