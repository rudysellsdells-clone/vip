# VIP Sprint 2.15 — Quality Automation / Batch Gates

## Goal

Make quality gates easier to operate at scale.

Instead of applying quality gates one asset at a time, this sprint adds a batch quality automation screen:

```text
/quality-automation
```

## What It Does

The page shows:

```text
reviewed assets
pending quality gates
ready decisions
auto-approved decisions
needs-revision decisions
current threshold settings
```

It also adds:

```text
Run Batch Quality Gates
```

This applies the current editable thresholds to the latest reviewed assets.

## Files Included

```text
src/lib/content-quality/batch-quality-gates.ts
src/app/api/content-quality/gates/apply-batch/route.ts
src/components/content-quality/RunBatchQualityGatesButton.tsx
src/app/(app)/quality-automation/page.tsx
src/components/layout/SidebarNav.tsx
README_QUALITY_AUTOMATION_BATCH_GATES_2_15.md
```

## No SQL Required

This uses existing tables:

```text
generated_assets
asset_quality_reviews
quality_gate_settings
quality_gate_decisions
activity_log
```

## Navigation

Adds:

```text
Command → Quality Automation
```

## Behavior

Batch processing:

```text
finds active reviewable assets
loads latest quality reviews
skips reviews that already have gate decisions
applies current Settings thresholds
creates quality_gate_decisions records
auto-approves only if settings allow it
```

## Safe Default

With the recommended settings:

```text
approval_mode = mark_ready
require_human_approval = true
```

batch processing will not auto-approve or publish anything.

It will only create `ready_for_publishing` or `needs_revision` decisions.

## Apply

1. Add/replace included files.
2. Commit.
3. Push.
4. Redeploy.

Suggested commit message:

```text
Add batch quality gate automation
```

## Test

1. Run quality reviews on a few assets.
2. Open:

```text
/quality-automation
```

3. Confirm reviewed assets appear.
4. Click:

```text
Run Batch Quality Gates
```

5. Confirm decisions are created.
6. Open:

```text
/ready-for-publishing
```

7. Confirm passing assets appear there.
