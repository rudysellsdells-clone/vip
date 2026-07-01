# H1.6A — Marketing Spine / Campaign Strategy Gate

This patch introduces **Marketing Spine** as a visible VIP feature and the first real strategy gate in the content workflow.

## What this adds

Marketing Spine creates a lightweight strategy chain of custody:

**Brand → Strategy → Channels → Plan → Briefs → Assets → Quality → Publishing**

The goal is to improve originality and depth without turning campaign generation into a long manual form.

## Key behavior

- No SQL required.
- No new OpenAI/API call is added to monthly campaign generation.
- The spine is generated deterministically from the existing monthly campaign fields, Brand Voice shortcuts, and account market profile defaults.
- Monthly campaign generation still uses fast batch mode to avoid Vercel timeouts.
- The generated Marketing Spine is stored in campaign and asset metadata.
- Every generated asset gets an `assetBrief`.
- Quality review now sees the Marketing Spine and Asset Brief when scoring content.

## UI changes

On the monthly campaign generator, you will now see:

- A visible **Marketing Spine** card.
- Gate status:
  - `Spine ready`
  - `Spine usable, but thin`
  - `Needs context`
- Readiness score out of 100.
- Audience, offer, buyer pain, CTA, originality angle, and channel roles.
- Optional refinements:
  - Originality Angle
  - Objections to Address

The optional fields are not required. VIP will infer them if left blank.

## Metadata added

Campaign metadata now includes:

- `marketingSpine`
- `marketingSpineUsage`
- `generationMode: marketing_spine_fast_batch_planner`

Asset metadata now includes:

- `marketingSpine`
- `assetBrief`
- `strategyInheritancePath`

Activity log metadata now includes:

- `marketingSpine`
- `marketingSpineGateStatus`
- `marketingSpineReadinessScore`

## Quality review

Quality review now checks whether an asset follows the supplied Marketing Spine and Asset Brief. It should penalize assets that ignore:

- audience
- offer
- originality angle
- proof point
- objection
- channel role
- CTA

## Test checklist

1. Go to `/content-calendar`.
2. Open the monthly campaign generator.
3. Fill/select:
   - month
   - campaign theme
   - audience
   - offer
   - CTA
   - proof points if available
4. Confirm the **Marketing Spine** card updates.
5. Generate the monthly campaign package.
6. Open Monthly Review.
7. Open a generated asset and confirm it still loads.
8. Run Quality Review on one asset.
9. Confirm the result is saved normally.

## SQL required

None.

## Validation

A targeted TypeScript check was run against the modified files successfully.

Full repo typecheck is currently blocked by existing Supabase auth type drift in the uploaded repo's dependency setup, unrelated to this patch.
