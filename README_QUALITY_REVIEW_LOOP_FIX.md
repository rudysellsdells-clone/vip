# VIP Quality Review Loop Fix

## Problem

The latest run showed:

```text
Batches: 40
Reviewed: 200
Asset count: 65
Reviewable count: 30
Remaining: 25
```

That means the bulk review was reviewing the same failed assets repeatedly.

## Cause

Failed assets were being marked:

```text
quality_workflow_status = needs_human_review_after_quality
```

But the route still treated that status as reviewable on the next batch.

So the process kept re-reviewing the same failed records.

## Correct Rule

Default bulk quality review should only review:

```text
quality_workflow_status = not_checked
quality_checked_at is null
```

After an asset is reviewed once, it should leave the bulk queue whether it passed or failed.

Passing assets move to:

```text
review_ready
```

Failing assets move to:

```text
needs_human_review_after_quality
```

Both are no longer part of the default bulk queue.

## Files Included

```text
src/app/api/content-calendar/monthly-campaigns/bulk-quality-review/route.ts
src/components/content-calendar/BulkQualityReviewButton.tsx
sql/reset_june_quality_reviews_after_loop.sql
README_QUALITY_REVIEW_LOOP_FIX.md
```

## Apply

1. Replace the route.
2. Replace the button.
3. Optional but recommended: run `sql/reset_june_quality_reviews_after_loop.sql`.
4. Commit.
5. Push.
6. Redeploy.

Suggested commit message:

```text
Stop bulk quality review from rechecking failed assets
```

## Test

After resetting June quality reviews:

1. Run Bulk Quality Review.
2. Confirm total reviewed never exceeds the real asset count.
3. Confirm `remainingAfterBatch` goes down.
4. Confirm the run stops naturally.
5. Confirm assets move to:
   - `review_ready`
   - `needs_human_review_after_quality`

## Important

The checkbox was renamed to:

```text
Recheck already-reviewed assets once
```

That mode intentionally runs only one batch so it cannot loop forever.
