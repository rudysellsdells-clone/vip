# VIP Sprint 2.13B — Quality Gate Workflow Integration

## Goal

Connect editable quality thresholds back into the real workflow.

After this patch, users can apply quality gates directly from:

```text
/approvals
/content-quality
```

## What This Adds

### Latest decision route

```text
src/app/api/assets/[assetId]/quality-gate/latest/route.ts
```

Loads the latest quality gate decision for an asset.

### Quality gate action panel

```text
src/components/content-quality/QualityGateActionPanel.tsx
```

Shows:

```text
latest gate decision
pass/fail status
reason
Apply Quality Gate button
```

### Updated approval quality widget

```text
src/components/approvals/ApprovalQualityWidget.tsx
```

Now includes a visible Quality Gate section under the quality review.

### Updated content quality page

```text
src/app/(app)/content-quality/page.tsx
```

Now shows the quality gate controls directly on reviewed assets and recent reviews.

### Badge helper

```text
src/components/content-quality/QualityGateDecisionBadge.tsx
```

Optional helper for future UI use.

## No SQL Required

This uses the tables created in Sprint 2.13:

```text
quality_gate_settings
quality_gate_decisions
```

## Workflow

```text
Generate asset
→ Review Quality
→ Apply Quality Gate
→ VIP checks editable thresholds
→ Decision is saved
```

Possible decisions:

```text
ready_for_publishing
auto_approved
needs_revision
disabled
```

## Safe Default

If your settings are:

```text
approval_mode = mark_ready
require_human_approval = true
```

then passing assets are not automatically approved.

They are simply marked as:

```text
ready_for_publishing
```

in the `quality_gate_decisions` table.

## Apply

1. Add/replace included files.
2. Commit.
3. Push.
4. Redeploy.

Suggested commit message:

```text
Integrate quality gates into workflow
```

## Test

1. Open `/settings`.
2. Confirm quality thresholds are set.
3. Open `/approvals`.
4. Run **Review Quality** on an asset.
5. Click **Apply Quality Gate**.
6. Confirm a decision appears.
7. Confirm a row appears in:

```text
quality_gate_decisions
```

8. Open `/content-quality`.
9. Confirm the same gate controls appear there too.
