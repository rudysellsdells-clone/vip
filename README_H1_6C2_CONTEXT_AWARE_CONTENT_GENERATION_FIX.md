# H1.6C2 — Context-Aware Content Generation Fix

This patch fixes an issue where generated blog/content assets could repeat brand, market, or calendar context too literally instead of using that information as private guidance.

## What changed

- Added a Context-to-Copy Firewall to the prompt doctrine.
- Updated calendar item generation prompts so monthly plan and calendar fields are clearly marked as private context.
- Cleaned generated calendar assets before saving so leaked planning/context labels are removed.
- Updated the fast monthly campaign first-draft templates so blog, email, social, and video assets translate strategy fields into public copy instead of dropping raw fields into the body.
- Added lightweight context-label stripping for deterministic monthly content so labels like `Service context:`, `Audience pain points:`, `Offer details:`, and similar fields are treated as source material.

## Files changed

- `src/lib/ai/prompt-doctrine.ts`
- `src/lib/content-calendar/asset-generation.ts`
- `src/app/api/content-calendar/items/[itemId]/generate/route.ts`
- `src/lib/content-calendar/monthly-campaign-planner.ts`
- `src/lib/content/public-content-cleaner.ts`

## SQL required

No SQL required.

## Expected behavior

When a blog post or other asset is generated, brand and content planning fields should influence the angle, examples, CTA, and structure, but should not be pasted into the finished asset as raw context or intake-form language.

