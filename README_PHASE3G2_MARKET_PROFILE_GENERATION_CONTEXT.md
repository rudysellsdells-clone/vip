# VIP Phase 3G.2 Account Market Profile Generation Context Patch

## Purpose

This patch connects the new account-level service lines, offers, and audiences to monthly campaign generation.

The goal is to prevent service-business accounts from generating Web Search Professionals / marketing-agency content by default.

## What changes

### 1. Monthly campaign generation now reads the active account

The monthly generator loads the signed-in user's active account and fetches that account's:

- Service lines
- Audiences
- Offers

### 2. Monthly generator shows account strategy selectors

On:

```text
/content-calendar/monthly
```

The generation form now includes:

- Service Line
- Audience
- Offer

The user can select which account strategy records should guide the month.

If nothing is selected, VIP uses the first available active service line, audience, and offer as defaults.

### 3. Backend uses selected market profile as generation defaults

The API route uses selected service/audience/offer values as private strategy defaults for:

- Monthly objective
- Target audience
- Primary offer
- Key topics
- CTA
- Differentiator
- Proof points
- Business context

Manual fields still win. If the user types a manual target audience or offer, the backend respects the manual entry.

### 4. Campaigns and assets are tagged with account context

Generated campaigns/assets now receive:

```text
account_id
```

where available, and metadata includes the selected service line, audience, and offer.

### 5. Planner language is more service-business neutral

The monthly planner removes hard-coded marketing-agency defaults such as Web Search Pros-only hashtags and "visibility review" fallback copy.

It now uses more neutral service-business language when no market profile exists.

## Files included

```text
src/lib/accounts/account-market-profile.ts
src/lib/content-calendar/monthly-campaign-planner.ts
src/app/api/content-calendar/monthly-campaigns/generate/route.ts
src/components/content-calendar/GenerateMonthlyCampaignsButton.tsx
src/app/(app)/content-calendar/monthly/page.tsx
README_PHASE3G2_MARKET_PROFILE_GENERATION_CONTEXT.md
```

## Required prerequisite

This patch assumes Phase 3G.1 has been applied:

```text
service_lines.account_id
buyer_segments.account_id
offers.account_id
```

## No SQL migration included

No new database migration is needed for this patch.

## Test checklist

1. Open an account.
2. Add at least one service line, audience, and offer in the account Strategy section.
3. Go to `/content-calendar/monthly`.
4. Confirm the monthly generator shows the active account and strategy dropdowns.
5. Generate a monthly campaign package.
6. Confirm generated copy uses the selected service/audience/offer.
7. Confirm campaign/asset metadata includes the market profile.
8. Confirm GalaxyAI companion prompts are still created for Friday video scripts.

## Suggested commit message

```text
Use account market profile in monthly campaign generation
```
