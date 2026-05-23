# VIP Approval Quality Visible Fix

## Problem

The quality review button was not visible on approval cards.

## Cause

The prior Sprint 2.12 package created the approval quality panel as a drop-in component, but it did not modify the actual approvals page.

Also, if the approvals page is a client component, the server-side `ApprovalQualityPanel` may not be importable directly.

## Fix

This patch adds a client-safe approval widget:

```text
src/components/approvals/ApprovalQualityWidget.tsx
```

and a route to load the latest quality review:

```text
src/app/api/assets/[assetId]/quality-review/latest/route.ts
```

## Files Included

```text
src/app/api/assets/[assetId]/quality-review/latest/route.ts
src/components/approvals/ApprovalQualityWidget.tsx
docs/APPROVAL_QUALITY_WIDGET_INTEGRATION.md
README_APPROVAL_QUALITY_VISIBLE_FIX.md
```

## Manual Integration Required

Open:

```text
src/app/(app)/approvals/page.tsx
```

Add:

```tsx
import { ApprovalQualityWidget } from "@/components/approvals/ApprovalQualityWidget";
```

Then inside each approval card add:

```tsx
<ApprovalQualityWidget assetId={asset.id} />
```

Recommended placement:

```text
asset preview/content excerpt
→ ApprovalQualityWidget
→ existing approve/revise buttons
```

## What It Shows

```text
Quality Check
Latest quality score
Review Quality button
Request Improved Version button
Open Content Quality link
```

## Apply

1. Add included files.
2. Add the import/component call to the approvals page.
3. Commit.
4. Push.
5. Redeploy.

Suggested commit message:

```text
Show quality review controls on approval cards
```

## Test

1. Open `/approvals`.
2. Confirm every approval card shows **Quality Check**.
3. Click **Review Quality**.
4. Confirm the score appears.
5. Click **Request Improved Version**.
6. Confirm the new version appears in approvals.
