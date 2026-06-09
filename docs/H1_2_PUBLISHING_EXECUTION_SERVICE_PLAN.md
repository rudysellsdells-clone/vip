# H1.2 Publishing Execution Service Foundation Plan

## Purpose

H1.1 stabilized publishing. H1.2 should consolidate that working behavior into one canonical service so future publishing changes do not create additional routes, clients, or compatibility paths.

## Problem to solve

Publishing currently works, but the logic still lives across too many places:

- route handlers
- UI buttons
- Zapier helper files
- tool-run compatibility code
- result guards
- payload builders

The goal of H1.2 is not to rewrite everything at once. The goal is to create the canonical service boundary and begin moving the working behavior into it safely.

## Proposed canonical service

Create:

```text
src/lib/publishing/publishing-execution-service.ts
```

This service should eventually own:

1. Asset eligibility checks
2. Provider/channel routing
3. Payload building
4. Destination validation
5. ZapierMCP execution
6. Result guard evaluation
7. Publishing execution run writes
8. Asset status updates
9. Activity log writes
10. Safe error responses

## Route responsibility after H1.2

Routes should become thin wrappers:

```text
Parse request
Authenticate user
Resolve account context
Call publishingExecutionService
Return service result
```

Routes should not independently decide provider success, asset status, or destination safety.

## Initial H1.2 scope

Keep H1.2 small.

Recommended first implementation:

1. Add `publishing-execution-service.ts`.
2. Move shared success/failure interpretation into that service.
3. Move execution-run insert/update helper into that service.
4. Keep the current `/execute-zapier-mcp` route, but have it call the service for the shared pieces.
5. Do not delete old routes yet.

## Out of scope for first H1.2 patch

Do not include these in the first H1.2 patch:

- route deletion
- full RLS migration
- full Supabase type migration
- calendar lifecycle refactor
- GalaxyAI image publishing changes
- major UI redesign

## Expected benefit

After H1.2 begins, future publishing fixes should happen in one place.

The intended pattern:

```text
Add/change publishing behavior
→ update publishing-execution-service
→ routes remain thin
→ channel behavior stays consistent
```

## Test checklist

After the first H1.2 patch:

1. LinkedIn still publishes to the correct company page.
2. Facebook still publishes.
3. Gmail still creates a draft.
4. VIP still marks successful provider results completed.
5. Failed provider results stay failed.
6. No channel creates duplicate execution records.
7. Legacy routes still do not become visible primary paths.

## Success criteria

H1.2 is successful when the current working behavior remains intact and at least one piece of route-level publishing logic has been moved into the shared service without changing user-facing behavior.
