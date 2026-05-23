# VIP Sprint 2.11 — Content Quality + Brand Intelligence

## Goal

Add a quality layer before generated content reaches publishing or outreach.

VIP can now score active generated assets for:

```text
Brand voice
Clarity
CTA strength
SEO/AIO readiness
Conversion usefulness
Overall quality
```

## New SQL

Run this migration in Supabase:

```text
db/migrations/20260523_asset_quality_reviews.sql
```

It creates:

```text
asset_quality_reviews
```

## New Page

```text
/content-quality
```

## What It Does

The page lists active reviewable assets and lets you run:

```text
Review Quality
```

The review saves:

```text
overall_score
brand_voice_score
clarity_score
cta_score
seo_aio_score
conversion_score
summary
strengths
improvements
suggested_revision
```

## Files Included

```text
db/migrations/20260523_asset_quality_reviews.sql
src/lib/content-quality/reviewer.ts
src/app/api/assets/[assetId]/quality-review/route.ts
src/components/content-quality/QualityReviewButton.tsx
src/app/(app)/content-quality/page.tsx
src/components/layout/SidebarNav.tsx
README_CONTENT_QUALITY_BRAND_INTELLIGENCE_2_11.md
```

## Supported Asset Types

```text
blog_post
white_paper
authority_asset
prospect_what_if_story
linkedin_post
facebook_post
email
video_script
```

## Environment

Uses the existing OpenAI key:

```bash
OPENAI_API_KEY=
```

Optional:

```bash
OPENAI_MODEL=gpt-4.1-mini
```

## Navigation

Adds:

```text
Content → Content Quality
```

## Apply

1. Add/replace included files.
2. Run SQL migration.
3. Commit.
4. Push.
5. Redeploy.

Suggested commit message:

```text
Add content quality brand intelligence
```

## Test

1. Open:

```text
/content-quality
```

2. Pick an active asset.
3. Click **Review Quality**.
4. Confirm a score appears.
5. Confirm a row appears in:

```text
asset_quality_reviews
```

6. Confirm the review gives:
   - summary
   - strengths
   - suggested improvements
   - suggested revision

## Why This Matters

Phase Two can now create volume.

This sprint improves quality control so VIP can help decide what is ready, what needs revision, and what is strong enough to move toward publishing or outreach.
