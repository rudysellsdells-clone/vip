# VIP Development SOP

## Purpose

VIP has moved from prototype velocity into product hardening. This SOP exists to prevent duplicate paths, avoid assumption-based patches, and keep the platform stable as account, publishing, GalaxyAI, and campaign workflows mature.

## Operating principle

Every change must use an existing canonical system unless there is a written reason to create a new one.

Before coding, answer:

```text
What problem are we solving?
Which existing system owns this behavior?
What files should change?
What files should not change?
What database/RLS impact exists?
How will we test success and failure?
How do we roll back?
```

## Canonical systems

| Area | Canonical location | Notes |
|---|---|---|
| Account context | `src/lib/accounts/account-context.ts` | All multi-account reads/writes must resolve account access through this path or a documented successor. |
| Account strategy | `src/lib/accounts/account-market-profile.ts` | Service lines, audiences, and offers should feed generation through this layer. |
| Asset lifecycle | `src/lib/assets/asset-lifecycle.ts` | Status/version changes should not be hand-coded in unrelated routes. |
| Asset visibility | `src/lib/assets/asset-visibility.ts` | Working screens should use shared visibility rules. |
| Publishing routing | `src/lib/publishing/asset-routing.ts` and `src/lib/publishing/ready-routing.ts` | Use these for routing/labeling decisions. |
| Publishing payloads | `src/lib/publishing/output-payload.ts` | Social/Gmail payload shape belongs here until the publishing service is consolidated. |
| Zapier MCP registry | `src/lib/zapier/action-registry.ts` | App/action/tool mapping belongs here, not scattered through pages. |
| Zapier MCP client | `src/lib/zapier/mcp-client.ts` and write clients | Do not create another MCP client without an architecture decision. |
| GalaxyAI runs | `src/app/api/galaxyai/runs/*` and `src/lib/galaxyai/*` | Keep prompt/run/result handling in this lane. |
| Calendar placement | `src/lib/calendar/*` and `src/lib/content-calendar/*` | Avoid new calendar date fields without a migration plan. |

## Patch policy

### Good patch

```text
One clear behavior
Small file set
No unrelated cleanup
No new route if canonical route exists
No schema change unless required
Includes test checklist
Includes rollback guidance
```

### Risky patch

```text
Touches publishing, accounts, RLS, generated assets, and UI at once
Creates a new execution path
Adds a new table instead of extending the canonical model
Changes TypeScript types without checking call sites
Marks remote execution complete without provider success evidence
```

## Pre-patch checklist

1. Confirm project language/framework from the repo.
2. Confirm current file paths from the repo ZIP or current branch.
3. Search for existing code that already owns the behavior.
4. Decide whether the patch is UI-only, API-only, database-only, or cross-cutting.
5. Identify migration impact.
6. Identify RLS/account impact.
7. Identify publishing/external-call impact.
8. Keep changes as small as possible.
9. Include test and rollback notes.

## Post-patch checklist

1. `npm run build`
2. `npm run typecheck` when practical
3. Apply SQL migration if included
4. Confirm Supabase schema cache if columns changed
5. Test happy path
6. Test failure path
7. Confirm no legacy path was accidentally used
8. Document actual result

## Status language

Use precise status words:

```text
Designed = plan exists
Built = code patch exists
Applied = patch is in repo
Deployed = Vercel build succeeded
Tested = workflow was manually tested
Verified = expected external result occurred
```

Do not call a feature done until it is at least deployed and tested.
