# H1.6C5 — Human Content Generation Guardrails

## Purpose

This patch fixes the content quality issue where blog posts and social posts were copying brand, strategy, market profile, and training fields verbatim into public-facing content.

The old behavior allowed strategy fragments like audience notes, proof points, selected offers, and business outcomes to be stitched together as if they were finished copy. That produced awkward or nonsensical posts.

## What changed

### 1. Monthly campaign content now uses human-safe copy templates

The deterministic monthly generator no longer tries to turn raw brand/strategy/training fields directly into public sentences.

It now:

- treats brand/training/strategy fields as private guidance
- extracts only safe audience/topic/offer phrases
- avoids using long or sentence-like context as public copy
- writes blog/social/email/video drafts using everyday language
- follows a clearer logic path: problem → why it matters → useful insight → next step

### 2. AI-backed public copy upgrade added to monthly generation

If `OPENAI_API_KEY` is configured, monthly generation now attempts to upgrade public-facing text assets with AI-generated human copy.

AI upgraded asset types:

- `blog_post`
- `linkedin_post`
- `facebook_post`
- `email`
- `video_script`

Non-public companion assets, visual direction assets, and GalaxyAI prompt assets still use the fast deterministic workflow.

If OpenAI fails or is not configured, generation safely falls back to the improved human-safe fast draft templates.

### 3. Prompt rules now explicitly block field-stitching

Prompt doctrine now tells the AI to:

- never stitch audience, offer, proof, and training fragments together
- rewrite awkward source material from scratch
- use everyday sentences the audience would understand
- make every asset follow a sensible marketing argument
- avoid output that sounds like a form, worksheet, strategy summary, or training note

### 4. Uploaded knowledge is now available to content generation memory

`knowledge_sources` was added to the memory lookup path.

When an account/workspace is active, memory lookup now prefers account-scoped knowledge sources where supported.

### 5. Sanity checks now catch field-stitch garbage

The publish-ready sanity checker now flags patterns like:

- “preferred business outcome”
- “practical proof or context point”
- “selected audience”
- “selected offer”
- broken “connects X needs Y to next step” phrasing

## Files changed

- `src/app/api/content-calendar/monthly-campaigns/generate/route.ts`
- `src/lib/ai/prompt-doctrine.ts`
- `src/lib/content-calendar/asset-generation.ts`
- `src/lib/content-calendar/monthly-campaign-planner.ts`
- `src/lib/content-generation/content-sanity.ts`
- `src/lib/content-generation/memory-context.ts`
- `src/lib/content-generation/publish-ready-weekly-generator.ts`
- `src/lib/content/public-content-cleaner.ts`

## SQL required

No SQL required.

## Testing notes

After applying this patch, generate a brand-new monthly campaign package.

Existing bad assets will not automatically change. Regenerate them or use the manual edit workflow added in H1.6C1.

If `OPENAI_API_KEY` is available, the API response should show:

`generationMode: "ai_humanized_public_copy"`

If OpenAI is unavailable or fails, the API response should show:

`generationMode: "human_safe_fast_draft"`

Either mode should avoid the old nonsense field-stitching issue.
