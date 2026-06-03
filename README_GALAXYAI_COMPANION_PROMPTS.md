# VIP GalaxyAI Companion Prompt Patch

## Purpose

This patch keeps the current GalaxyAI functionality in place, but makes the video workflow clearer:

- VIP still generates the Friday `video_script`.
- VIP now also creates a companion `galaxyai_prompt` from that video script.
- Both assets can be reviewed and approved.
- Only the approved `galaxyai_prompt` asset is routed toward GalaxyAI execution.
- The `video_script` remains a review/source asset and is not the GalaxyAI execution asset.

## Files included

```text
src/lib/galaxyai/prompt-builder.ts
src/lib/content-calendar/monthly-campaign-blueprint.ts
src/lib/content-calendar/monthly-campaign-planner.ts
src/app/api/content-calendar/monthly-campaigns/generate/route.ts
src/lib/ai/asset-pack-generator.ts
src/app/api/campaigns/[campaignId]/generate/route.ts
src/lib/publishing/ready-routing.ts
src/lib/publishing/asset-routing.ts
src/app/(app)/ready-for-publishing/page.tsx
```

## What changed

### 1. Shared GalaxyAI prompt builder

A new helper was added:

```text
src/lib/galaxyai/prompt-builder.ts
```

It turns an approved-style video script into a production-ready GalaxyAI prompt with:

- video title/theme
- target viewer
- strategic angle
- approved script
- production direction
- visual style
- CTA frame
- anti-hype / no-fake-metrics guidance

### 2. Monthly campaign asset sets

The weekly campaign blueprint now creates:

```text
Friday video script
Friday GalaxyAI video prompt
```

The new prompt is generated from the Friday video script and scheduled shortly after it.

### 3. Asset linking

When monthly campaign assets are inserted, the `galaxyai_prompt` is linked to the companion `video_script` using:

```text
parent_asset_id
metadata.source_video_script_asset_id
metadata.display_with_asset_id
metadata.companion_to_asset_type
```

This should make the prompt discoverable as a companion/child asset from the video script detail view.

### 4. Campaign asset pack generation

The regular campaign asset pack still creates `video_script` and `galaxyai_prompt`, but the GalaxyAI prompt is now normalized from the actual generated `shortVideoScript`.

### 5. Publishing-ready routing

The execution candidate is now:

```text
galaxyai_prompt
```

not:

```text
video_script
```

This matches the existing GalaxyAI run route, which already requires:

```text
asset.asset_type === "galaxyai_prompt"
asset.status === "approved"
```

## Expected behavior

When you generate a monthly campaign asset set:

```text
1 blog post
5 LinkedIn posts
5 Facebook posts
1 email
1 video script
1 GalaxyAI prompt
```

The Friday video script and Friday GalaxyAI prompt should both show for review.

Once approved, the GalaxyAI prompt is the asset that can be used for GalaxyAI generation.

## Apply instructions

Copy the files in this patch into the same paths in your VIP repo, replacing existing files where applicable.

Then commit and push to GitHub so Vercel rebuilds.

Suggested commit message:

```text
Add GalaxyAI companion prompts for video scripts
```
