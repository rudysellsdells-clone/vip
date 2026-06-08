# VIP Phase H0 Development Guardrails Patch

## Purpose

This patch starts the VIP hardening phase without changing production runtime behavior.

It adds documentation and one audit script so future development stops creating duplicate paths, accidental legacy execution flows, and unclear handoffs.

## Why now

The repo has grown quickly through patch-based iteration. Current risks include:

```text
multiple publishing execution paths
legacy Zapier/tool run compatibility paths
multi-account RLS/account-context gaps
heavy untypedSupabase usage
calendar repair migration history
large patch README sprawl
```

H0 defines the guardrails before larger hardening work begins.

## Files included

```text
docs/DEVELOPMENT_SOP.md
docs/ARCHITECTURE_DECISIONS.md
docs/PATCH_CHECKLIST.md
docs/PUBLISHING_EXECUTION_STANDARD.md
docs/ACCOUNT_SECURITY_STANDARD.md
docs/HARDENING_BACKLOG.md
scripts/audit-vip-baseline.mjs
README_PHASE_H0_DEVELOPMENT_GUARDRAILS.md
```

## Runtime impact

None.

This patch does not change:

```text
Next.js pages
API routes
Supabase schema
RLS policies
publishing behavior
GalaxyAI behavior
monthly generation behavior
```

## How to run the audit

From the repo root:

```bash
node scripts/audit-vip-baseline.mjs
```

Optional JSON output:

```bash
node scripts/audit-vip-baseline.mjs --json
```

## What the audit reports

```text
API route count
migration count
README patch count
publishing-related API routes
untypedSupabase usage
execute_zapier_write_action references
legacy send-to-zapier references
account context references
service-role references
SQL user_id-only RLS patterns
metadata property access risks
```

## What to do next

Recommended next phase:

```text
H1 — Publishing consolidation
```

Goal:

```text
one canonical publishing execution service
legacy routes delegate or fail clearly
provider success evidence required before completed status
LinkedIn/Facebook/Gmail share one execution standard
```

## Suggested commit message

```text
Add VIP development guardrails and baseline audit
```

## Rollback

Delete the added docs and audit script. Since this patch has no runtime behavior, rollback is low risk.
