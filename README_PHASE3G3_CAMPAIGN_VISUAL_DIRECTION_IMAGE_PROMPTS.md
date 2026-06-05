# VIP Phase 3G.3 Campaign Visual Direction and Image Prompts Patch

## Purpose

This patch starts the campaign visual automation layer without generating or publishing images yet.

It adds one weekly `campaign_visual_direction` asset per campaign week and one companion `galaxyai_image_prompt` asset for each LinkedIn and Facebook post.

## New asset types

```text
campaign_visual_direction
galaxyai_image_prompt
```

## Weekly package after this patch

Each usable campaign week now generates:

```text
1 campaign visual direction
5 LinkedIn posts
5 LinkedIn image prompts
5 Facebook posts
5 Facebook image prompts
1 blog post
1 email
1 video script
1 GalaxyAI video prompt
```

That is 25 assets per week.

## Review-first workflow

This patch does not send image prompts to GalaxyAI automatically. It creates prompts for review and links each image prompt back to its matching social post.

Future phases can send approved image prompts to GalaxyAI, store the image in Supabase Storage, and attach the hosted image to social publishing payloads.

## Artifact control

Image prompts include instructions to review generated images at least three times for distorted hands, malformed faces, warped logos, fake UI numbers, misspelled text, clutter, mismatched objects, and other artifacts before accepting the final output.

## Files included

```text
src/lib/galaxyai/image-prompt-builder.ts
src/lib/content-calendar/monthly-campaign-blueprint.ts
src/lib/content-calendar/monthly-campaign-planner.ts
src/app/api/content-calendar/monthly-campaigns/generate/route.ts
```

## Suggested commit message

```text
Add campaign visual directions and GalaxyAI social image prompts
```
