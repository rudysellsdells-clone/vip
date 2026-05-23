# VIP Sprint 2.14 — Ready-for-Publishing Queue

## Goal

Create a clean destination for assets that passed the quality gate.

This sprint adds:

```text
/ready-for-publishing
```

The queue sits between quality gating and publishing execution.

## Workflow

```text
Generate asset
→ Review Quality
→ Apply Quality Gate
→ Ready-for-Publishing Queue
→ Approve
→ Publishing Ready
→ Execute
```

## What It Shows

The page lists active assets that have a passing quality gate decision:

```text
ready_for_publishing
auto_approved
```

Each card shows:

```text
Asset title
Asset type
Approval status
Gate decision
Overall score
Score breakdown
Gate reason
Destination/channel
Next step
Approve for Publishing button
Workflow links
```

## Files Included

```text
src/lib/publishing/ready-routing.ts
src/components/ready-for-publishing/ReadyAssetActions.tsx
src/app/(app)/ready-for-publishing/page.tsx
src/components/layout/SidebarNav.tsx
README_READY_FOR_PUBLISHING_QUEUE_2_14.md
```

## No SQL Required

This uses existing tables:

```text
quality_gate_decisions
generated_assets
```

## Navigation

Adds:

```text
Command → Ready Queue
```

## Apply

1. Add/replace included files.
2. Commit.
3. Push.
4. Redeploy.

Suggested commit message:

```text
Add ready for publishing queue
```

## Test

1. Open `/approvals`.
2. Run **Review Quality** on an asset.
3. Click **Apply Quality Gate**.
4. If the asset passes, open:

```text
/ready-for-publishing
```

5. Confirm the asset appears.
6. Click **Approve for Publishing**.
7. If the asset type is LinkedIn, Facebook, email, or video, open `/publishing-ready`.
8. Confirm the approved asset appears there.

## Why This Matters

Quality gates now have a practical home.

This keeps VIP from jumping directly from "passed quality" to "publish" while still speeding up the workflow.
