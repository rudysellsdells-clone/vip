# VIP Auto Quality Review Resilience Fix

## Problem

Generation succeeded, but the follow-up automatic quality review failed with:

```text
Monthly campaigns generated, but automatic quality review failed.
```

## What This Means

The campaign/assets were created successfully.

The failure happened after generation, when the UI tried to call:

```text
/api/content-calendar/monthly-campaigns/bulk-quality-review
```

## Likely Causes

Most likely one of these:

```text
missing quality workflow columns
missing asset_quality_reviews scoring columns
Supabase/PostgREST schema cache not refreshed
bulk quality route returned an error but the UI hid the details
```

## Fixes Included

### 1. Required field SQL

Run:

```text
db/migrations/20260525_bulk_quality_review_required_fields.sql
```

This safely adds/refreshes the fields needed by bulk/automatic quality review.

### 2. Generation no longer fails because quality review fails

Replaces:

```text
src/components/content-calendar/GenerateMonthlyCampaignsButton.tsx
```

If quality review fails after generation, the UI now shows a warning instead of treating the whole generation as failed.

The assets stay saved.

### 3. Better error output from bulk quality review

Replaces:

```text
src/app/api/content-calendar/monthly-campaigns/bulk-quality-review/route.ts
```

The route now returns a clearer hint when the quality review layer fails.

## Files Included

```text
db/migrations/20260525_bulk_quality_review_required_fields.sql
src/components/content-calendar/GenerateMonthlyCampaignsButton.tsx
src/app/api/content-calendar/monthly-campaigns/bulk-quality-review/route.ts
README_AUTO_QUALITY_REVIEW_RESILIENCE_FIX.md
```

## Apply

1. Run SQL:

```text
db/migrations/20260525_bulk_quality_review_required_fields.sql
```

2. Replace the two files.
3. Commit.
4. Push.
5. Redeploy.

Suggested commit message:

```text
Make automatic quality review resilient after generation
```

## Test

1. Reset/generate a month with automatic quality review enabled.
2. If quality review succeeds, the form shows reviewed/passed/regenerated counts.
3. If quality review fails, generation still succeeds and the UI shows the quality warning.
4. Open:

```text
/content-calendar/monthly-review?month=2026-06
```

5. Run Bulk Quality Review manually if needed.
