# VIP Bulk + Automatic Quality Review

## Goal

This corrects the previous sprint direction.

Rudy wanted:

```text
Quality review in bulk or automatically
```

Not just bulk approval.

## What This Adds

### 1. Bulk quality review runner

```text
src/lib/content-quality/monthly-quality-review-runner.ts
```

This is the shared worker that:

```text
loads all active assets for a month
runs quality scoring
stores asset_quality_reviews
marks passing assets as review_ready
regenerates weak assets once using the quality feedback
scores regenerated assets
keeps failed originals traceable but inactive
flags still-failing assets for human review
```

### 2. Bulk quality review API

```text
POST /api/content-calendar/monthly-campaigns/bulk-quality-review
```

Payload:

```json
{
  "month": "2026-06",
  "regenerateWeakAssets": true,
  "maxRegenerations": 1,
  "includeAlreadyChecked": false
}
```

### 3. Bulk quality review button

```text
src/components/content-calendar/BulkQualityReviewButton.tsx
```

This lets Rudy run quality review across the selected month from the Monthly Review page.

### 4. Automatic quality review after generation

Updates:

```text
src/components/content-calendar/GenerateMonthlyCampaignsButton.tsx
```

Adds checkboxes:

```text
Automatically run quality review after generation
Automatically regenerate weak assets once using quality feedback
```

When enabled, the system runs generation and then immediately runs the monthly bulk quality review.

## Important Difference From Approval

This does **not** auto-approve content.

It only handles:

```text
quality review
scoring
feedback
regeneration
review-ready status
```

Approval remains separate.

## Files Included

```text
src/lib/content-quality/monthly-quality-review-runner.ts
src/app/api/content-calendar/monthly-campaigns/bulk-quality-review/route.ts
src/components/content-calendar/BulkQualityReviewButton.tsx
src/components/content-calendar/GenerateMonthlyCampaignsButton.tsx
README_BULK_AUTOMATIC_QUALITY_REVIEW.md
```

## No SQL Required

Uses the Sprint 2.22 fields:

```text
quality_workflow_status
auto_quality_attempts
parent_asset_id
superseded_by_asset_id
is_active_version
quality_checked_at
review_ready_at
```

## Monthly Review Page Integration

Add this import:

```ts
import { BulkQualityReviewButton } from "@/components/content-calendar/BulkQualityReviewButton";
```

Then add this card near the quality controls:

```tsx
<article className={websiteStyles.card}>
  <BulkQualityReviewButton month={selectedMonth} />
</article>
```

## Apply

1. Add the quality runner.
2. Add the bulk-quality-review API route.
3. Add the BulkQualityReviewButton.
4. Replace GenerateMonthlyCampaignsButton.
5. Add the button to Monthly Review page.
6. Commit, push, redeploy.

Suggested commit message:

```text
Add bulk and automatic quality review
```

## Test

### Bulk review test

1. Generate a month.
2. Open:

```text
/content-calendar/monthly-review?month=2026-06
```

3. Click:

```text
Run Bulk Quality Review
```

4. Confirm:
   - all active monthly assets are scored
   - reviews are saved
   - passing assets become review-ready
   - weak assets regenerate once
   - still-failing assets are flagged for human review

### Automatic review test

1. Reset a month.
2. Open monthly calendar.
3. Generate the month with:

```text
Automatically run quality review after generation
```

enabled.

4. Confirm generation finishes and then quality review runs.
5. Open Monthly Review and confirm assets are already scored.
