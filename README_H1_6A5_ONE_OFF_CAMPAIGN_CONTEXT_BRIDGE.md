# H1.6A5 — One-Off Campaign Context Bridge

This patch corrects the earlier assumption that the Campaign Builder was legacy.

## What this does

The one-off campaign builder stays active, but it now has better strategic inputs.

On `/campaigns`, the one-off campaign form now pulls usable dropdowns from:

- **Settings / Market Data**
  - Service Lines
  - Buyer Segments
  - Offers
- **Brand Voice**
  - Audiences
  - Offers
  - Tone
  - CTA
  - Differentiators
  - Proof Points
- **Knowledge**
  - Knowledge Sources
  - Content Examples

## Why this matters

The monthly workflow should use the full Marketing Spine gate.

The one-off campaign workflow should still exist for fast campaigns, but it should not force manual retyping or create shallow briefs. This patch gives the one-off builder access to the same strategic source material.

## Behavior

When you select settings/brand/knowledge options:

- Buyer segment can fill audience and objections.
- Service line can fill campaign idea and goal.
- Offer can fill campaign idea, goal, and CTA.
- Brand Voice shortcuts can fill audience, offer, tone, CTA, differentiator, and proof points.
- Knowledge selections append source material into notes/context.

When the campaign is saved, VIP stores the selected context into:

- `campaigns.notes`
- `campaigns.strategy`

When one-off asset generation runs, that saved strategy context is passed into the generation prompt and saved into generated asset metadata.

## Campaign detail page

The campaign detail page is clarified as an active one-off path:

- **One-Off Campaign Brief**
- **One-off campaign controls**
- Keeps **Generate Asset Pack**

If H1.6A4 was applied, this patch restores the active one-off generation path.

## SQL required

None.

## Apply order

Apply after H1.6A/H1.6A2/H1.6A3.

Do **not** apply H1.6A4. If H1.6A4 was already applied, apply this patch to restore the one-off campaign path.

## Test checklist

1. Open `/campaigns`.
2. Confirm the form says **Create a one-off campaign**.
3. Confirm Settings dropdowns appear:
   - Buyer Segment
   - Service Line
   - Offer
4. Confirm Brand Voice shortcuts appear if Brand Voice is populated.
5. Confirm Knowledge / Example Source appears if Knowledge has entries.
6. Select a buyer segment and confirm audience/objection context fills.
7. Select an offer and confirm idea/goal/CTA can populate.
8. Select tone/CTA/proof point from Brand Voice.
9. Select one Knowledge source.
10. Create campaign.
11. Open the campaign detail page.
12. Confirm **Generate Asset Pack** still appears.
13. Generate asset pack.
14. Open one generated asset and confirm it sounds more specific to the selected context.

## Commit message

`H1.6A5 One-off campaign context bridge`
