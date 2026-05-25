# VIP Bulk + Automatic Review Approval

## Goal

Make it possible to review/approve generated assets in bulk or automatically after the auto quality gate.

Rudy asked:

```text
Is it possible to review all generated assets at once? Or even better automatically?
```

## Recommended Flow

```text
Generate monthly assets
→ Run Auto Quality Gate
→ Passing assets become review-ready
→ Option A: bulk approve all quality-passed assets
→ Option B: automatically approve passing assets during quality gate
→ Failed assets still go to human review
```

## What This Adds

### 1. Bulk approve endpoint

```text
POST /api/content-calendar/monthly-campaigns/approve-review-ready
```

Payload:

```json
{
  "month": "2026-06",
  "confirmText": "2026-06"
}
```

It approves all active assets for that month where:

```text
quality_workflow_status = review_ready
status != approved
is_active_version != false
```

### 2. Bulk approve button

```text
src/components/content-calendar/ApproveReviewReadyMonthButton.tsx
```

This can be added to the Monthly Review page.

### 3. Auto-approve option during quality gate

Updates:

```text
src/components/content-calendar/RunAutoQualityGateButton.tsx
src/app/api/content-calendar/monthly-campaigns/auto-quality/route.ts
```

Adds checkbox:

```text
Automatically approve assets that pass the quality gate
```

If checked, passing assets are marked:

```text
status = approved
quality_workflow_status = review_ready
```

Failed assets still regenerate or go to human review.

## Files Included

```text
src/app/api/content-calendar/monthly-campaigns/approve-review-ready/route.ts
src/components/content-calendar/ApproveReviewReadyMonthButton.tsx
src/app/api/content-calendar/monthly-campaigns/auto-quality/route.ts
src/components/content-calendar/RunAutoQualityGateButton.tsx
README_BULK_AND_AUTO_REVIEW_APPROVAL.md
```

## No SQL Required

This uses the quality workflow fields added in Sprint 2.22.

## Apply

1. Add the approve-review-ready API route.
2. Add the bulk approve button component.
3. Replace the auto-quality route.
4. Replace RunAutoQualityGateButton.
5. Add the bulk approve button to Monthly Review if desired.
6. Commit, push, redeploy.

Suggested commit message:

```text
Add bulk and automatic approval for quality-passed assets
```

## Monthly Review Page Integration

Add this import:

```ts
import { ApproveReviewReadyMonthButton } from "@/components/content-calendar/ApproveReviewReadyMonthButton";
```

Then place this inside the control card grid near `RunAutoQualityGateButton`:

```tsx
<article className={websiteStyles.card}>
  <ApproveReviewReadyMonthButton month={selectedMonth} />
</article>
```

## Test

1. Generate a clean month.
2. Open:

```text
/content-calendar/monthly-review?month=2026-06
```

3. Run Auto Quality Gate with auto-approve unchecked.
4. Confirm passing assets become review-ready.
5. Use the bulk approve button.
6. Confirm approved count increases.
7. Reset/regenerate if needed.
8. Run Auto Quality Gate with auto-approve checked.
9. Confirm passing assets become approved automatically.
