# H1.2 Publishing Execution Service Foundation

## Status

Initial service-boundary patch.

## Purpose

H1.1 proved that LinkedIn, Facebook, and Gmail can publish correctly through the canonical ZapierMCP path. H1.2 begins consolidating that working behavior so future publishing changes happen in one shared service instead of being patched separately in route handlers.

## What changed

This patch adds:

```text
src/lib/publishing/publishing-execution-service.ts
```

The new service owns the first safe pieces of shared publishing behavior:

1. Already-sent/published checks
2. Channel naming
3. Destination naming
4. Publishing execution run creation
5. Publishing execution run completion
6. Publishing execution run failure
7. Provider-result reference extraction

The canonical route remains:

```text
/api/publishing/assets/[assetId]/execute-zapier-mcp
```

The route still owns the proven behavior that was stabilized in H1.1:

- authentication
- asset loading
- account publishing settings attachment
- approval checks
- LinkedIn destination validation
- output payload building
- ZapierMCP call
- MCP result guard
- asset status update
- activity log writes

## Why this is intentionally small

This patch does not rewrite publishing. It creates the service boundary and moves only low-risk execution-run lifecycle logic.

That is deliberate. LinkedIn, Gmail, and Facebook are now working, so H1.2 should preserve behavior while reducing duplication.

## Before

The `execute-zapier-mcp` route contained its own helper logic for:

- detecting already-published assets
- choosing channel/destination
- creating `publishing_execution_runs`
- updating completed/failed execution status
- extracting result references

## After

The route imports those helpers from:

```text
src/lib/publishing/publishing-execution-service.ts
```

## Runtime behavior

Expected runtime behavior should be unchanged.

The successful path remains:

```text
Approved asset
→ /api/publishing/assets/[assetId]/execute-zapier-mcp
→ structured params
→ ZapierMCP
→ success guard
→ publishing_execution_runs completed
→ generated_assets sent/published
→ activity_log entry
```

## Test checklist

After deploy:

1. Publish one LinkedIn post.
2. Confirm it lands on the correct LinkedIn company page.
3. Confirm VIP marks the asset completed.
4. Create one Gmail draft.
5. Confirm Gmail receives the draft and VIP marks completed.
6. Publish one Facebook post.
7. Confirm Facebook receives the post and VIP marks completed.
8. Confirm `/actions` and `/zapier` still show execution history.

## What is intentionally not included

This patch does not:

- delete legacy routes
- change UI labels
- change provider payloads
- change account/RLS policies
- change Supabase types
- refactor tool-runs
- refactor GalaxyAI
- change calendar or asset generation
- alter database schema

## Next H1.2 step

If this patch builds and all three channels still pass, the next H1.2 patch can move one more piece into the service:

```text
provider result normalization + activity log helper
```

Do not move payload building or destination validation yet unless the next test cycle is clean.
