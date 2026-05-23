# VIP Approvals Page Replacement with Quality Controls

## Problem

The Review Quality button was not visible because the quality widget was not actually rendered inside the approvals page.

## Fix

This patch replaces the approvals page with a quality-aware approvals page.

It includes:

```text
Review Quality button
Request Improved Version button
Approve Asset button
Approve All Visible Review Assets button
Quality score display
Review summary display
Suggested improvements display
```

## Files Included

```text
src/app/(app)/approvals/page.tsx
src/components/approvals/ApprovalStatusActions.tsx
src/components/approvals/ApproveAllVisibleAssetsButton.tsx
src/app/api/assets/[assetId]/approval-status/route.ts
src/app/api/approvals/approve-all/route.ts
src/app/api/assets/[assetId]/quality-review/latest/route.ts
src/components/approvals/ApprovalQualityWidget.tsx
README_APPROVALS_PAGE_REPLACEMENT_WITH_QUALITY.md
```

## No SQL Required

This uses existing tables:

```text
generated_assets
asset_quality_reviews
activity_log
```

## Requirements

This assumes these prior sprints are already installed:

```text
Content Quality + Brand Intelligence
Quality Review Resubmission
Archive columns on generated_assets
```

## Apply

1. Replace/add included files.
2. Commit.
3. Push.
4. Redeploy.

Suggested commit message:

```text
Replace approvals page with quality-aware approvals
```

## Test

1. Open:

```text
/approvals
```

2. Confirm each review card shows:

```text
Quality Check
Review Quality
Request Improved Version
Approve Asset
```

3. Click **Review Quality**.
4. Confirm a score appears.
5. Click **Request Improved Version**.
6. Confirm the new version appears in approvals.
7. Click **Approve Asset**.
8. Confirm the asset disappears from the review queue and appears in approved/publishing-ready areas.

## Note

This is a full page replacement because the earlier drop-in approach did not visibly wire into the live approvals render path.
