# VIP Hardening Backlog

This backlog converts the outside code review into a controlled engineering plan.

## H0 — Repo baseline and guardrails

Status: planned/active.

Deliverables:

```text
docs/DEVELOPMENT_SOP.md
docs/ARCHITECTURE_DECISIONS.md
docs/PATCH_CHECKLIST.md
docs/PUBLISHING_EXECUTION_STANDARD.md
docs/ACCOUNT_SECURITY_STANDARD.md
scripts/audit-vip-baseline.mjs
```

No runtime behavior changes.

## H1 — Publishing consolidation

Goal: one reliable publishing execution path.

Tasks:

```text
Create publishing-execution-service.ts
Make canonical route use the service
Make legacy routes delegate or fail clearly
Unify LinkedIn/Facebook/Gmail response guards
Require provider success evidence before completed status
Add duplicate handling that reports skipped, not false completed
```

Risk: medium-high. External integrations involved.

## H2 — Account/RLS audit and hardening

Goal: prevent cross-account data access.

Tasks:

```text
List account-owned tables
Add missing account_id where needed
Backfill account_id safely
Update RLS policies to account membership checks
Audit API routes using service-role client
Add account-scope tests/manual checks
```

Risk: high. Security and database behavior involved.

## H3 — Supabase types and TypeScript safety

Goal: reduce runtime and Vercel build issues.

Tasks:

```text
Regenerate database.types.ts
Keep untypedSupabase available temporarily
Remove untypedSupabase from critical routes first
Create Json guard utilities for metadata/output/input
Add typecheck to normal handoff checklist
```

Risk: medium. Potential widespread type fallout.

## H4 — Calendar and asset lifecycle stabilization

Goal: reduce repair migrations and status confusion.

Tasks:

```text
Document source of truth for calendar placement
Centralize asset state transitions
Add constraints for one active asset version per family
Reduce duplicate date fields over time
Add monthly generation to calendar visibility test
```

Risk: medium-high. Core UX involved.

## H5 — Error handling and observability

Goal: make failures easier to diagnose.

Tasks:

```text
Standardize readable errors
Add structured execution logs
Consider Sentry or similar
Add env validation
Add admin diagnostics screen later
```

Risk: low-medium.

## Launch gate checklist

Before first real client onboarding:

```text
LinkedIn publishing verified
Facebook publishing verified
Gmail path verified or disabled
GalaxyAI image prompt run verified
Generated image storage verified
Account member cannot access another account
Main routes build clean
Known legacy routes documented
```
