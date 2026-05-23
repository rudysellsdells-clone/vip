# Quality Gate Approvals Integration

This sprint adds editable quality thresholds and a quality gate evaluator.

## Add gate button to approval cards

If you want the quality gate button visible on approval cards, import:

```tsx
import { ApplyQualityGateButton } from "@/components/content-quality/ApplyQualityGateButton";
```

Then place it where you already show the latest quality review.

You need a `reviewId`, so the easiest version is to add it later to the quality widget after it loads a review.

## How it works

```text
Review Quality
→ Apply Quality Gate
→ VIP compares scores to editable thresholds
→ VIP records a quality_gate_decisions row
```

Depending on settings:

```text
mark_ready
```

Creates a `ready_for_publishing` decision but does not approve the asset.

```text
auto_approve
```

If `require_human_approval` is false, passing assets are marked `approved`.

```text
disabled
```

Records disabled/no-op decisions.
