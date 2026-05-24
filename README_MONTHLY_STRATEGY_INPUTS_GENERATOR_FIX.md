# VIP Monthly Strategy Inputs Generator Fix

## Goal

Regenerate June cleanly and make sure campaign strategy inputs are part of the generation flow.

## What This Adds

The monthly campaign generation card now includes strategy fields:

```text
Monthly Objective
Target Audience
Primary Offer
Key Topics / Weekly Angles
Differentiator
Call to Action
Proof Points / Supporting Context
Additional Business Context
```

Those inputs flow into:

```text
campaign idea
campaign metadata.strategy
weekly campaign angles
generated blog posts
generated LinkedIn posts
generated Facebook posts
generated email
generated video script
activity log metadata
```

## Cleanup SQL

Run this first to remove the current June test batch:

```text
db/migrations/20260524_clear_june_2026_generated_test_batch.sql
```

## Files Included

```text
db/migrations/20260524_clear_june_2026_generated_test_batch.sql
src/lib/content-calendar/monthly-campaign-planner.ts
src/components/content-calendar/GenerateMonthlyCampaignsButton.tsx
src/app/api/content-calendar/monthly-campaigns/generate/route.ts
README_MONTHLY_STRATEGY_INPUTS_GENERATOR_FIX.md
```

## Apply

1. Run cleanup SQL if you want June cleared.
2. Replace included files.
3. Commit.
4. Push.
5. Redeploy.

Suggested commit message:

```text
Add strategy inputs to monthly campaign generator
```

## Test

1. Open:

```text
/content-calendar/monthly?month=2026-06
```

2. Fill in strategy inputs.
3. Generate June campaigns.
4. Confirm the result says something like:

```text
Created 5 campaign(s) and 65 asset(s)
```

5. Open a generated asset and confirm the content reflects:
   - objective
   - audience
   - offer
   - topics
   - CTA
   - proof points
