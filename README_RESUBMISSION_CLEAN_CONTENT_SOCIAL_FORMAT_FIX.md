# VIP Resubmission Clean Content + Social Format Fix

## Problem

Quality-resubmitted/regenerated content had two issues:

```text
1. Social posts did not include emoji/hashtags.
2. Public content included internal trace metadata like prior asset ID and new asset ID.
```

## Cause

The resubmission route was intentionally prepending this to the saved asset body:

```text
Quality resubmission based on review: ...
Original asset ID: ...
```

That tracking belongs in metadata, not customer-facing content.

Also, the resubmission path did not apply the same social formatting rules as the monthly campaign generator.

## Fix

### New cleaner/formatter utility

```text
src/lib/content/public-content-cleaner.ts
```

It:

```text
strips internal trace lines
removes asset/review ID lines
detects social asset types
adds missing emoji to LinkedIn/Facebook content
adds missing hashtags to LinkedIn/Facebook content
```

### Updated resubmitter

```text
src/lib/content-quality/resubmitter.ts
```

It now tells the model:

```text
do not include asset IDs or review IDs
include emoji and hashtags for LinkedIn/Facebook posts
return public-facing content only
```

### Updated resubmission route

```text
src/app/api/quality-reviews/[reviewId]/resubmit/route.ts
```

It no longer prepends tracking lines into the content body.

Tracking remains safely in:

```text
activity_log.metadata
```

It also inherits the original asset’s calendar fields so the resubmitted asset stays in the correct month/week/date.

## Optional Cleanup SQL

For existing bad resubmitted assets, run:

```text
db/migrations/20260524_strip_resubmission_trace_lines.sql
```

This removes trace lines from already-saved content.

## Files Included

```text
src/lib/content/public-content-cleaner.ts
src/lib/content-quality/resubmitter.ts
src/app/api/quality-reviews/[reviewId]/resubmit/route.ts
db/migrations/20260524_strip_resubmission_trace_lines.sql
README_RESUBMISSION_CLEAN_CONTENT_SOCIAL_FORMAT_FIX.md
```

## Apply

1. Add the cleaner utility.
2. Replace the resubmitter file.
3. Replace the resubmission route.
4. Optional: run cleanup SQL.
5. Commit.
6. Push.
7. Redeploy.

Suggested commit message:

```text
Clean resubmitted asset content and preserve social formatting
```

## Test

1. Pick a LinkedIn or Facebook asset.
2. Run quality review.
3. Request resubmission.
4. Open the new asset.
5. Confirm:
   - no prior asset ID
   - no new asset ID
   - no review ID
   - emoji appear
   - hashtags appear
6. Confirm the asset remains on the same campaign/month schedule.
