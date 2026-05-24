# VIP Private Strategy Prompt / Public Content Fix

## Goal

Use strategy inputs as private generation guidance without printing the raw strategy fields in customer-facing content.

Rudy clarified:

```text
The strategy doesn't need to appear in the content. It needs to be added to the prompt because I don't want it to be published with the content.
```

## What This Changes

### Before

Generated content could include strategy labels like:

```text
Monthly objective:
Audience:
Offer:
Differentiator:
Proof:
```

### After

Strategy inputs are treated as private generation context.

They are stored in campaign/activity metadata as:

```text
privateStrategy
generationPrompt
strategyUsage
```

The public asset content is clean and does not print raw planning labels.

## Files Included

```text
src/lib/content-calendar/monthly-campaign-planner.ts
src/app/api/content-calendar/monthly-campaigns/generate/route.ts
README_PRIVATE_STRATEGY_PROMPT_PUBLIC_CONTENT_FIX.md
```

## No SQL Required

This only changes generator behavior.

## What Still Uses Strategy

Strategy still influences:

```text
campaign topic
weekly angle
CTA
offer positioning
social hashtags
social emoji
content direction
```

But it does not publish internal labels or raw strategy notes.

## Apply

1. Replace included files.
2. Commit.
3. Push.
4. Redeploy.

Suggested commit message:

```text
Use strategy as private generation context
```

## Test

1. Reset June if desired.
2. Fill in strategy fields.
3. Generate June campaigns.
4. Open generated assets.
5. Confirm the content does **not** include:
   - Monthly objective:
   - Target audience:
   - Primary offer:
   - Differentiator:
   - Proof points:
   - Additional business context:
6. Confirm content still reflects the topic, CTA, offer direction, and social hashtag/emoji improvements.
