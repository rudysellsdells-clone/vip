# H1.5C — Brand Voice to Monthly Campaign Bridge

This patch fixes the disconnect between `/brand-voice` and monthly campaign creation.

## What was wrong

The Brand Voice page stores useful strategy fields as flexible text / comma-separated summaries, but the monthly campaign creation flow was only reading the structured Account Strategy records (`service_lines`, `buyer_segments`, and `offers`).

That meant Brand Voice inputs like audience, offer, CTA, tone, proof points, and business context did not show up as useful campaign generation choices.

## What this changes

Monthly campaign generation now reads the active workspace's:

- `digital_clone_profiles`
- `account_brand_profiles`
- `brand_rules`

It turns comma-separated or line-separated Brand Voice text into dropdown shortcuts on the monthly campaign generator.

## New monthly generator behavior

On `/content-calendar/monthly`, the generator now includes a **Brand Voice shortcuts** card.

It can populate:

- Target Audience
- Primary Offer
- Brand Tone
- CTA
- Differentiator
- Proof Points
- Additional Business Context
- Monthly Objective defaults

The fields remain editable after selection, so the user can pick from Brand Voice and then fine-tune the campaign.

## Files changed

- `src/lib/accounts/brand-voice-monthly-options.ts`
- `src/app/(app)/content-calendar/monthly/page.tsx`
- `src/components/content-calendar/GenerateMonthlyCampaignsButton.tsx`
- `src/app/api/content-calendar/monthly-campaigns/generate/route.ts`
- `src/lib/content-calendar/monthly-campaign-planner.ts`
- `src/lib/accounts/account-market-profile.ts`

## SQL required

None.

## Validation

- `npm run typecheck` passed.
- `next build` compiled successfully through the production compile + TypeScript stages in the local container. The container timed out during Next's page data collection phase, which has happened on this repo before and was not caused by a TypeScript error.

## Test plan

1. Go to `/brand-voice`.
2. Add comma-separated audiences, offers, tone phrases, CTAs, proof points, or positioning notes.
3. Save the Brand Voice profile.
4. Go to `/content-calendar/monthly`.
5. Confirm the **Brand Voice shortcuts** card appears.
6. Pick values from the dropdowns.
7. Confirm they populate the monthly campaign generation fields.
8. Generate a month and confirm the chosen tone/audience/offer/context are present in the private strategy metadata and influence the generated assets.
