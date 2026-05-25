# VIP Sprint 2.22 — Auto Quality Gate Before Review

## Goal

Quality scoring should happen before human review.

New flow:

```text
Generate monthly campaign assets
→ Run auto quality scoring
→ Passing assets become review-ready
→ Failing assets regenerate once using the quality feedback
→ Regenerated assets are scored again
→ Best active version appears in Monthly Review
```

## What This Adds

### SQL

```text
db/migrations/20260524_auto_quality_gate_before_review.sql
```

Adds workflow/version fields to `generated_assets`:

```text
quality_workflow_status
auto_quality_attempts
parent_asset_id
superseded_by_asset_id
is_active_version
quality_checked_at
review_ready_at
```

Also ensures quality review scoring columns exist on `asset_quality_reviews`.

### Quality Gate Helper

```text
src/lib/content-quality/auto-quality-gate.ts
```

Scores:

```text
overall
brand voice
clarity
CTA
SEO/AIO
conversion
```

It uses OpenAI when available and falls back to a simple heuristic scorer if needed.

### API Route

```text
POST /api/content-calendar/monthly-campaigns/auto-quality
```

Payload:

```json
{
  "month": "2026-06",
  "maxRegenerations": 1
}
```

### Review Board Button

```text
src/components/content-calendar/RunAutoQualityGateButton.tsx
```

Adds a button to the Monthly Review page.

### Updated Monthly Review

```text
src/app/(app)/content-calendar/monthly-review/page.tsx
```

Now shows:

```text
not scored
quality passed
needs human review
active versions only
```

## Status Values

```text
not_checked
review_ready
auto_regenerated_from_failed_quality
needs_human_review_after_quality
```

## Important Behavior

Failed originals are not deleted.

They are marked:

```text
is_active_version = false
superseded_by_asset_id = new asset id
```

The review board shows only active versions.

## Apply

1. Run SQL:

```text
db/migrations/20260524_auto_quality_gate_before_review.sql
```

2. Add included files.
3. Commit.
4. Push.
5. Redeploy.

Suggested commit message:

```text
Add auto quality gate before review
```

## Test

1. Generate a clean month.
2. Open:

```text
/content-calendar/monthly-review?month=2026-06
```

3. Click:

```text
Run Auto Quality Gate
```

4. Confirm:
   - assets are scored
   - passing assets show as quality passed
   - failing assets regenerate once
   - failed originals do not clutter the board
   - regenerated assets keep campaign/month/schedule fields
5. Open an auto-regenerated asset and confirm it does not include internal IDs, private prompt notes, or campaign labels.
