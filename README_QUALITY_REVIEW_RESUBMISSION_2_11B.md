# VIP Sprint 2.11B — Quality Review Resubmission

## Goal

Let Rudy request a new improved version of an asset based on the quality review notes.

This turns the quality review from a passive score into an active improvement loop:

```text
Generate asset
→ Review quality
→ Request improved version
→ New asset created
→ New asset goes back to approvals
```

## What This Adds

### New resubmission helper

```text
src/lib/content-quality/resubmitter.ts
```

Uses the original asset plus review text, scores, strengths, improvements, and suggested revision to create a stronger version.

### New API route

```text
src/app/api/quality-reviews/[reviewId]/resubmit/route.ts
```

Creates a new `generated_assets` row with:

```text
same asset_type
same campaign_id if present
status = needs_review
version = original version + 1
```

The original asset is not overwritten.

### New button component

```text
src/components/content-quality/RequestQualityResubmissionButton.tsx
```

Adds:

```text
Request Improved Version
```

### Updated quality page

```text
src/app/(app)/content-quality/page.tsx
```

Shows the resubmission button anywhere a review exists.

## No SQL Required

This uses the existing:

```text
asset_quality_reviews
generated_assets
activity_log
```

tables.

## Behavior

When a resubmission is created, the new asset content includes traceability at the top:

```text
Quality resubmission based on review: <review id>
Original asset ID: <asset id>
```

Then the improved content follows.

## Apply

1. Add/replace included files.
2. Commit.
3. Push.
4. Redeploy.

Suggested commit message:

```text
Add quality review resubmission loop
```

## Test

1. Open:

```text
/content-quality
```

2. Run a quality review on an asset.
3. Click:

```text
Request Improved Version
```

4. Confirm a new asset is created.
5. Open the new asset.
6. Confirm it has:
   - same asset type
   - next version number
   - status `needs_review`
   - improved content based on the quality review
7. Confirm it appears in `/approvals`.

## Why This Matters

This creates the review/improvement loop we need before auto-publishing:

```text
content volume
→ quality scoring
→ intelligent resubmission
→ better approval outcomes
```
