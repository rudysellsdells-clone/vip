# VIP H1.1D params.company_id TypeScript Build Fix

## What this fixes

Vercel failed with:

```text
Property 'company_id' does not exist on type ...
```

The LinkedIn destination-lock patch correctly needs to inspect `company_id`, but `buildPublishingOutputParams(...)` returns a union of different publishing payload shapes. WordPress/Gmail/Facebook payloads do not all have `company_id`, so TypeScript blocks direct property access.

## File replaced

```text
src/app/api/publishing/assets/[assetId]/execute-zapier-mcp/route.ts
```

## Change made

The route now narrows/casts publishing params to a generic record before reading optional LinkedIn fields:

```ts
const paramsRecord = params as Record<string, unknown>;

isLikelyLinkedInOrganizationId(String(paramsRecord.company_id ?? ""))
```

The POST execution path also passes `paramsRecord` into the LinkedIn destination validator and MCP execution helpers.

No behavior changed. This only fixes TypeScript's union-type complaint while preserving the LinkedIn destination lock.

## Suggested commit message

```text
Fix LinkedIn destination lock params typing
```
