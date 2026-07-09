# H1.6C9 — One-Off Campaign Brief Priority + Verbatim Context Guard

## Purpose

This patch fixes the one-off campaign asset pack generator so detailed user campaign inputs become the controlling creative brief instead of being ignored, buried in generic brand memory, or pasted verbatim into public assets.

## What changed

- Adds a one-off campaign control brief builder.
- Treats user notes, core messages, differentiators, proof points, objections, strategy context, and source context as high-priority campaign direction.
- Explicitly tells the generator to use the meaning of those fields without copying them word-for-word into public-facing assets.
- Adds audience perspective and campaign depth sections to one-off asset pack prompts.
- Keeps H1.6C8 asset-pack resilience behavior, including OpenAI timeout/fallback handling.
- Rejects OpenAI asset packs when public assets are too thin or appear to leak raw planning labels.
- Improves the safe fallback asset pack so it speaks to the final audience and explains practical audit/review areas.
- Runs generated one-off assets through the public content cleaner before saving them.

## Files included

- `README_H1_6C9_ONE_OFF_CAMPAIGN_BRIEF_PRIORITY.md`
- `src/lib/content-generation/one-off-campaign-brief.ts`
- `src/lib/ai/prompts.ts`
- `src/lib/ai/asset-pack-generator.ts`
- `src/app/api/campaigns/[campaignId]/generate/route.ts`

## SQL required

No SQL is required.

## How to test

1. Delete/archive the bad campaign from its campaign detail page.
2. Create a new one-off campaign with a detailed prompt.
3. Include specific notes such as:
   - who the audience is
   - what the audit/review should examine
   - what owners should understand after the audit
   - objections to address
   - core messages
   - desired CTA
4. Generate the asset pack.
5. Confirm public assets do not include labels like `Core messages:`, `Proof points:`, `Buyer segment:`, `Strategy context:`, or copied prompt text.
6. Confirm the public assets speak to the end audience, not to marketers.

## Expected improvement

The generator should now produce content that sounds closer to:

> Dental practice owners do not need another vague marketing report. They need to know why nearby competitors are easier to find, whether their Google profile and website are answering the right patient questions, and what should be fixed first.

Instead of:

> Core messages: AI audit helps dental practices understand visibility. Proof points: Google Business Profile, website content, reviews.
