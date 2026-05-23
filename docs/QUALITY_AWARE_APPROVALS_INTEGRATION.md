# Quality-Aware Approvals Integration

This patch intentionally does not overwrite your existing approvals page.

To add quality scores and resubmission controls to approval cards, use the new drop-in component:

```tsx
import { ApprovalQualityPanel } from "@/components/approvals/ApprovalQualityPanel";
```

Then add this inside each approval asset card:

```tsx
<ApprovalQualityPanel assetId={asset.id} />
```

## Recommended Placement

Place it after the asset preview/content excerpt and before the approve/revise buttons.

Example:

```tsx
<article key={asset.id} className={websiteStyles.card}>
  {/* existing badges/title/content */}

  <ApprovalQualityPanel assetId={asset.id} />

  {/* existing approval buttons */}
</article>
```

## What the Panel Shows

- Latest quality score
- Quality gate label
- Review summary
- Brand voice score
- Clarity score
- CTA score
- SEO/AIO score
- Conversion score
- Suggested improvements
- Review Quality button
- Request Improved Version button

## Workflow

```text
Open Approvals
→ See latest quality score
→ Run quality review if missing
→ Request improved version if weak
→ Approve if strong
```

## Optional Badge Only

If the approvals card is too crowded, you can use only the badge component near the card header:

```tsx
import { ApprovalQualitySummaryBadge } from "@/components/approvals/ApprovalQualitySummaryBadge";
```

Then pass the latest review score if your page already loads quality reviews:

```tsx
<ApprovalQualitySummaryBadge score={latestReview?.overall_score} />
```

The full panel is better for now because it loads the latest review by asset ID automatically.
