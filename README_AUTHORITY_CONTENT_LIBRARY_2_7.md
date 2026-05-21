# VIP Sprint 2.7 — Authority Content Library

## Goal

Add a focused authority content tool for:

```text
Blog posts
White papers
Authority assets
```

This keeps Phase Two moving without adding more prospect complexity.

## What This Adds

### New page

```text
/authority-content
```

### New generator helper

```text
src/lib/authority-content/generator.ts
```

### New API route

```text
src/app/api/authority-content/generate/route.ts
```

### New form component

```text
src/components/authority-content/AuthorityContentGeneratorForm.tsx
```

## Workflow

```text
Open /authority-content
→ Choose content type
→ Enter title, topic, audience, goal, offer focus, CTA
→ Generate authority content
→ Asset is saved to generated_assets
→ Status is needs_review
→ Review / revise / approve as normal
```

## Content Types

```text
blog_post
white_paper
authority_asset
```

## No SQL Required

This uses the existing:

```text
generated_assets
activity_log
```

tables.

## Required Env

Uses the existing OpenAI key:

```bash
OPENAI_API_KEY=
```

Optional:

```bash
OPENAI_MODEL=gpt-4.1-mini
```

## Optional Navigation Link

This patch does not overwrite your navigation file.

If you want it in the menu, add a link to:

```text
/authority-content
```

Suggested label:

```text
Authority Content
```

Good placement:

```text
Command → Content Calendar
Growth → Authority Content
```

## Apply

1. Add included files.
2. Commit.
3. Push.
4. Redeploy.

Suggested commit message:

```text
Add Authority Content Library
```

## Test

1. Open:

```text
/authority-content
```

2. Generate a blog post.
3. Confirm the generated asset appears on the page.
4. Open `/approvals`.
5. Confirm the asset is waiting for review.
6. Try a white paper.
7. Confirm the white paper is also saved as a review-ready asset.

## Next Step

After this works, the next useful sprint is:

```text
Content repurposing
```

Example:

```text
Approved blog post
→ LinkedIn post
→ Facebook post
→ email teaser
→ short video prompt
```
