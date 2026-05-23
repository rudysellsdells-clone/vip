# VIP Sprint 2.12 — Quality-Aware Approvals

## Goal

Bring quality review signals directly into the approvals workflow.

Instead of jumping between `/content-quality` and `/approvals`, each approval card can now show:

```text
latest quality score
quality label
review summary
score breakdown
suggested improvements
Review Quality button
Request Improved Version button
```

## Files Included

```text
src/lib/content-quality/score-gates.ts
src/lib/content-quality/latest-review.ts
src/components/approvals/ApprovalQualityPanel.tsx
src/components/approvals/ApprovalQualitySummaryBadge.tsx
docs/QUALITY_AWARE_APPROVALS_INTEGRATION.md
README_QUALITY_AWARE_APPROVALS_2_12.md
```

## No SQL Required

This uses the existing table from Sprint 2.11:

```text
asset_quality_reviews
```

## Safe Integration

This patch does not overwrite the current approvals page.

To wire it in, open your approvals page, likely:

```text
src/app/(app)/approvals/page.tsx
```

Add:

```tsx
import { ApprovalQualityPanel } from "@/components/approvals/ApprovalQualityPanel";
```

Then inside each approval card, add:

```tsx
<ApprovalQualityPanel assetId={asset.id} />
```

## Recommended Placement

Place the panel after the asset preview and before the approval buttons.

## Why This Matters

This makes quality control part of the main approval workflow:

```text
Review asset
→ See quality score
→ Request improved version if needed
→ Approve only when strong enough
```

That prepares VIP for future auto-approval rules.

## Apply

1. Add included files.
2. Add the import and component call to `/approvals`.
3. Commit.
4. Push.
5. Redeploy.

Suggested commit message:

```text
Add quality-aware approvals panel
```

## Test

1. Open `/approvals`.
2. Confirm each approval card shows the Quality Check panel.
3. Click **Review Quality** on an asset without a review.
4. Confirm score appears after refresh.
5. Click **Request Improved Version**.
6. Confirm a new asset appears in approvals.
7. Approve a high-scoring asset as normal.
