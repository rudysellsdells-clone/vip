# VIP Architecture Decisions

This file records product-level engineering decisions so future patches do not create competing paths.

## ADR-001: VIP is a Next.js + TypeScript application

VIP is a Next.js application using TypeScript, Supabase, and Vercel. Future code patches must assume this stack unless the repo itself proves otherwise.

## ADR-002: Account context is mandatory for multi-account features

Any feature that creates, reads, updates, deletes, publishes, or generates account-owned data must resolve account context. New multi-account functionality must not rely only on `user_id`.

Canonical helper:

```text
src/lib/accounts/account-context.ts
```

## ADR-003: Publishing must converge to one execution service

VIP currently has multiple publishing/execution routes. Until a consolidated service is built, new publishing features must use the documented canonical path and must not create another route/client.

Target future service:

```text
src/lib/publishing/publishing-execution-service.ts
```

Current canonical route for social publishing:

```text
src/app/api/publishing/assets/[assetId]/execute-zapier-mcp/route.ts
```

Legacy/deprecated paths must either delegate to the canonical service or fail clearly.

## ADR-004: Zapier MCP requires structured params

Instructions are not enough. Generic Zapier MCP executor calls must include:

```json
{
  "selected_api": "LinkedInCLIAPI",
  "app": "LinkedIn",
  "action": "create_company_update",
  "params": {
    "comment": "...",
    "company_id": "..."
  }
}
```

Values must not live only inside `instructions`.

## ADR-005: Remote execution success requires provider evidence

VIP must not mark LinkedIn, Facebook, Gmail, WordPress, or GalaxyAI runs complete merely because a local route returned without throwing.

Success evidence can include:

```text
provider record id
provider post URL
provider status = PUBLISHED / completed
known Zapier MCP result id
known GalaxyAI completed media result
```

Provider error text must keep the run failed or needs attention.

## ADR-006: Deprecate before deleting

Legacy code should be hidden from UI, logged if used, and delegated where possible before removal. Delete only after successful test cycles.

## ADR-007: Generated files belong outside compiled app paths unless intended

Example/demo files should not live under paths compiled by Next.js unless they are part of the product.

Avoid:

```text
examples/**/*.ts imported or compiled by Next.js
src/examples/*
```

## ADR-008: JSONB is acceptable for flexible metadata, not primary workflow state

Frequently queried workflow fields should become columns over time. JSONB may store flexible provider details, snapshots, and optional metadata.

## ADR-009: Calendar model needs stabilization before major expansion

Calendar repair migrations indicate the model evolved quickly. New calendar features must use existing calendar helpers and should not add more denormalized fields unless approved in a separate architecture note.
