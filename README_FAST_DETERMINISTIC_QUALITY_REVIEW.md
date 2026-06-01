# VIP Fast Deterministic Quality Review

## Problem

Bulk quality review is still timing out on Vercel.

Even with small batches, model-backed review can exceed the function timeout.

## Product Decision

For workflow testing, bulk quality review should not call OpenAI at all.

It should run a fast deterministic quality pass that:

```text
scores content
saves asset_quality_reviews
updates quality_workflow_status
moves passing assets to review_ready
moves weaker assets to needs_human_review_after_quality
```

Deeper model-backed review can be reintroduced later as a single-asset action.

## Files Included

```text
src/lib/content-quality/fast-quality-review.ts
src/app/api/content-calendar/monthly-campaigns/bulk-quality-review/route.ts
src/components/content-calendar/BulkQualityReviewButton.tsx
README_FAST_DETERMINISTIC_QUALITY_REVIEW.md
```

## What Changed

The bulk route now:

```text
does not import auto-quality-gate
does not call OpenAI
uses fast heuristic scoring
processes up to 25 assets per request
returns mode: fast_deterministic
```

## Why

The purpose right now is to test the full workflow:

```text
generate
quality review
approve
schedule
send to Zapier
mark sent/published
archive/history
```

The quality step should not block testing.

## Apply

1. Add `src/lib/content-quality/fast-quality-review.ts`.
2. Replace the bulk-quality-review route.
3. Replace `BulkQualityReviewButton.tsx`.
4. Commit.
5. Push.
6. Redeploy.

Suggested commit message:

```text
Use fast deterministic bulk quality review
```

## Test

1. Open `/content-calendar/monthly-review`.
2. Run Bulk Quality Review.
3. Confirm the response says:

```text
Mode: fast_deterministic
```

4. Confirm batches complete without timeout.
5. Confirm assets move to:
   - `review_ready`
   - or `needs_human_review_after_quality`

## Important

If this still times out, Vercel is almost certainly still serving an older route or the page is calling a different API endpoint.

Search the repo for:

```text
bulk-quality-review
generateAutoQualityReview
auto-quality-gate
```

The bulk route should not call `generateAutoQualityReview`.
