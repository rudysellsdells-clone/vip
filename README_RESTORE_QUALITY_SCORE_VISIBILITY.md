# VIP Restore Quality Score Visibility

## Problem

Quality review is now working, but the updated UI no longer clearly shows:

```text
quality score
pass/fail state
review summary
improvement notes
proof that an asset was tested
```

That makes it hard to trust the workflow.

## What This Patch Does

Adds visible quality review evidence back into the working cards.

## Files Included

```text
src/lib/content-quality/review-display.ts
src/lib/content-quality/load-quality-reviews.ts
src/components/content-quality/QualityScorePanel.tsx
src/components/calendar/WorkingAssetCard.tsx
src/components/calendar/WorkingAssetGroups.tsx
src/app/(app)/content-quality/page.tsx
src/app/(app)/approvals/page.tsx
src/app/(app)/content-calendar/monthly-review/page.tsx
README_RESTORE_QUALITY_SCORE_VISIBILITY.md
```

## Pages Updated

```text
/content-quality
/approvals
/content-calendar/monthly-review
```

## New UI Behavior

Cards now show:

```text
overall score
quality label: Strong / Good / Needs review / Weak / Not scored
quality workflow status
review summary
sub-scores on the quality page
improvement notes on the quality page
strengths on the quality page
```

## How To Interpret

### Not quality tested

```text
No review row exists and quality_workflow_status is not_checked.
```

### Quality tested: review ready

```text
A review exists and the asset passed the quality gate.
```

### Quality tested: needs human review

```text
A review exists and the asset failed the fast quality gate.
```

## Apply

1. Add/replace the included files.
2. Commit.
3. Push.
4. Redeploy.

Suggested commit message:

```text
Restore quality score visibility on working cards
```

## Test

1. Open `/content-calendar/monthly-review`.
2. Confirm reviewed assets show a quality panel.
3. Open `/content-quality`.
4. Confirm detailed sub-scores and improvement notes show.
5. Open `/approvals`.
6. Confirm approval cards show the latest quality score.
