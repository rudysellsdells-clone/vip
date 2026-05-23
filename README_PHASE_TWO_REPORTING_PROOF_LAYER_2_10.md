# VIP Sprint 2.10 — Phase Two Reporting / Proof Layer

## Goal

Show proof of work from Phase Two so VIP can demonstrate value.

This gives Rudy and future users a reporting view showing what VIP has:

```text
planned
generated
repurposed
reviewed
approved
packaged
drafted
executed
tracked
```

## New Page

```text
/phase-two-reporting
```

## What It Reports

### Planning

- Content calendar plans
- Calendar items
- Generated calendar items
- Published calendar items

### Content

- Authority assets
- What-If Stories
- Repurposed assets
- Assets needing review
- Approved assets

### Packaging / Outreach

- What-If PDF exports
- Gmail draft exports
- Completed Gmail draft exports

### Execution

- Publishing execution runs
- Completed runs
- Failed runs
- Recent run history

### Link Building

- Backlink opportunities
- Acquired backlinks

If optional link builder tables are not available, the page shows a small warning instead of breaking.

## Files Included

```text
src/lib/reports/safe-reporting.ts
src/app/(app)/phase-two-reporting/page.tsx
src/components/layout/SidebarNav.tsx
README_PHASE_TWO_REPORTING_PROOF_LAYER_2_10.md
```

## No SQL Required

This page reads existing tables:

```text
content_calendar_plans
content_calendar_items
generated_assets
asset_exports
publishing_execution_runs
backlink_opportunities
acquired_backlinks
```

## Archive-Aware

Generated asset metrics filter out archived assets with:

```ts
.is("archived_at", null)
```

## Navigation

Adds:

```text
Command → Reporting
```

## Apply

1. Add/replace included files.
2. Commit.
3. Push.
4. Redeploy.

Suggested commit message:

```text
Add Phase Two reporting proof layer
```

## Test

1. Open:

```text
/phase-two-reporting
```

2. Confirm metrics load.
3. Confirm recent assets show.
4. Confirm recent publishing runs show.
5. Confirm PDF/Gmail export records show.
6. Confirm the page does not break if optional link builder tables are empty.

## Why This Matters

This is the first proof-of-work layer for VIP.

It helps show:

```text
what was produced
what moved through review
what was approved
what was drafted
what was executed
```

That is important for Rudy's business and eventually for SaaS packaging.
