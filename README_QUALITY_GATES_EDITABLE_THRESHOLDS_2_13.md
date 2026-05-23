# VIP Sprint 2.13 — Quality Gates + Editable Thresholds

## Goal

Move toward controlled auto-approval while making quality thresholds editable in settings.

This adds:

```text
Editable quality thresholds
Quality gate evaluations
Ready-for-publishing decisions
Optional auto-approval mode
Settings page
```

## New SQL

Run this migration in Supabase:

```text
db/migrations/20260523_quality_gate_settings.sql
```

It creates:

```text
quality_gate_settings
quality_gate_decisions
```

## New Settings Page

```text
/settings/content-quality
```

This lets you edit:

```text
Overall minimum
Brand voice minimum
Clarity minimum
CTA minimum
SEO/AIO minimum
Conversion minimum
Approval mode
Human approval safety toggle
Enabled/disabled toggle
```

## Approval Modes

### mark_ready

Default and safest.

Passing assets get a decision:

```text
ready_for_publishing
```

but are not automatically approved.

### auto_approve

Passing assets can be marked:

```text
approved
```

only if:

```text
require_human_approval = false
```

### disabled

Quality gates do not make decisions.

## New API Routes

```text
GET /api/content-quality/settings
POST /api/content-quality/settings
POST /api/quality-reviews/[reviewId]/gate
```

## New Components

```text
src/components/content-quality/QualityGateSettingsForm.tsx
src/components/content-quality/ApplyQualityGateButton.tsx
```

## Files Included

```text
db/migrations/20260523_quality_gate_settings.sql
src/lib/content-quality/quality-gates.ts
src/app/api/content-quality/settings/route.ts
src/app/api/quality-reviews/[reviewId]/gate/route.ts
src/components/content-quality/QualityGateSettingsForm.tsx
src/components/content-quality/ApplyQualityGateButton.tsx
src/app/(app)/settings/content-quality/page.tsx
docs/QUALITY_GATE_APPROVALS_INTEGRATION.md
README_QUALITY_GATES_EDITABLE_THRESHOLDS_2_13.md
```

## Apply

1. Add included files.
2. Run SQL migration.
3. Commit.
4. Push.
5. Redeploy.

Suggested commit message:

```text
Add editable quality gates
```

## Test

1. Open:

```text
/settings/content-quality
```

2. Change a threshold and save.
3. Open `/content-quality`.
4. Run a quality review on an asset.
5. Use the quality gate API or wire the gate button into the approval/quality widget.
6. Confirm a row appears in:

```text
quality_gate_decisions
```

## Recommended Starting Settings

Keep this safe:

```text
approval_mode = mark_ready
require_human_approval = true
overall_min = 90
brand_voice_min = 85
cta_min = 85
```

That means VIP can recommend content as ready without approving or publishing automatically yet.
