# VIP Quality Review Object Error Fix

## Problem

Bulk quality review finishes with:

```text
[object Object]
```

and no reviews are saved.

## What This Fix Does

### 1. Makes quality review errors readable

Replaces:

```text
src/components/content-calendar/BulkQualityReviewButton.tsx
```

The UI now shows:

```text
reviewed count
reviewable count
passed count
failed count
skipped count
readable errors
debug details
```

### 2. Hardens the bulk quality review route

Replaces:

```text
src/app/api/content-calendar/monthly-campaigns/bulk-quality-review/route.ts
```

The route now:

```text
loads active latest-version assets
filters by month
reviews not_checked assets
saves asset_quality_reviews rows
updates quality_workflow_status
returns readable totals/errors
records an activity log
```

### 3. Ensures required SQL fields exist

Adds:

```text
db/migrations/20260601_quality_review_required_fields.sql
```

## Apply

1. Run the SQL migration.
2. Replace the included files.
3. Commit.
4. Push.
5. Redeploy.

Suggested commit message:

```text
Fix bulk quality review object errors
```

## Test

1. Open `/content-calendar/monthly-review`.
2. Run Bulk Quality Review.
3. Confirm the result shows reviewed/passed/failed/skipped counts.
4. Open `/content-quality`.
5. Confirm assets show updated quality workflow statuses.
6. Confirm `asset_quality_reviews` has rows in Supabase.

## Note

If `OPENAI_MODEL` is set to a model name the API does not support, the quality gate should fall back to heuristic scoring. Reviews should still save. If they do not, the details panel should now show the exact failing reason.
