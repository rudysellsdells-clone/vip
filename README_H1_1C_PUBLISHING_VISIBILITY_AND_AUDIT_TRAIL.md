# VIP H1.1C Publishing Visibility and Audit Trail Patch

## Purpose

This patch fixes the visibility gap found during H1.1 testing.

LinkedIn published successfully through ZapierMCP, but `/actions` and `/zapier` only showed legacy `tool_runs`, so Facebook/Gmail/canonical publishing work could disappear from those screens.

## What changed

### 1. Canonical ZapierMCP route now writes `publishing_execution_runs`

File:

```text
src/app/api/publishing/assets/[assetId]/execute-zapier-mcp/route.ts
```

The direct canonical route now:

1. Creates a `publishing_execution_runs` record before calling ZapierMCP.
2. Marks the run `completed` only after `assertSuccessfulMcpResult(...)` passes.
3. Marks the run `failed` if ZapierMCP fails or returns an error-like response.
4. Returns the completed run in the API response.
5. Adds `runId` to activity log entries.

This makes LinkedIn, Facebook, Gmail, and other direct ZapierMCP executions visible in the same audit system.

### 2. `/actions` now shows both canonical and legacy lanes

File:

```text
src/app/(app)/actions/page.tsx
```

The page now has:

- Canonical Publishing: `publishing_execution_runs`
- Legacy Actions: `tool_runs`

### 3. `/zapier` now shows both canonical and legacy Zapier records

File:

```text
src/app/(app)/zapier/page.tsx
```

The page now has:

- Recent ZapierMCP publishing executions
- Legacy Zapier tool runs
- Policies

## What this does not change

- No database migration
- No route deletion
- No Zapier action key changes
- No account/RLS changes
- No UI queue duplication of approved assets

`/publishing-schedule` remains the source of truth for approved assets ready to publish.

## Test checklist

1. Deploy the patch.
2. Publish one approved LinkedIn asset from VIP.
3. Confirm it appears in `/zapier` under canonical ZapierMCP publishing executions.
4. Confirm it appears in `/actions` under canonical publishing executions.
5. Publish one approved Facebook asset.
6. Confirm Facebook appears in the same canonical sections.
7. Verify legacy tool runs still appear under the legacy section if present.

## Suggested commit message

```text
Show canonical publishing executions in actions and zapier pages
```
