# VIP Phase 3G.5 Store GalaxyAI Social Images Patch

## Purpose

Phase 3G.4 allowed approved `galaxyai_image_prompt` assets to run through GalaxyAI.

Phase 3G.5 captures the completed GalaxyAI image output and turns it into a VIP-managed social image asset.

## What this patch does

When a GalaxyAI image prompt run completes and the run is refreshed:

1. VIP pulls completed GalaxyAI media.
2. VIP identifies the media item for the completed run.
3. VIP copies the image into Supabase Storage bucket `campaign-assets` when possible.
4. VIP creates a new `generated_social_image` asset.
5. VIP links that generated image asset back to:
   - the GalaxyAI image prompt asset
   - the parent LinkedIn/Facebook post asset
6. VIP stores hosted image metadata on the parent social post so a later publishing patch can attach the file directly.

## Files included

```text
src/app/api/galaxyai/runs/[runId]/route.ts
db/migrations/20260603_phase3g5_campaign_assets_storage.sql
README_PHASE3G5_STORE_GALAXYAI_SOCIAL_IMAGES.md
```

## Supabase migration

Run this migration:

```text
db/migrations/20260603_phase3g5_campaign_assets_storage.sql
```

It creates or updates a public Supabase Storage bucket:

```text
campaign-assets
```

Default object path pattern:

```text
accounts/{account_id}/campaigns/{campaign_id}/assets/{prompt_asset_id}/{file}
```

## Behavior notes

If VIP can copy the GalaxyAI image into Supabase Storage, the generated social image asset uses the Supabase public URL.

If the copy fails, VIP still creates the generated image asset using the original GalaxyAI media URL and records the hosting error in metadata. This prevents the workflow from losing the generated asset.

## What this does not do yet

This patch does not yet attach the hosted image file to LinkedIn/Facebook publish payloads.

The next patch should be:

```text
generated_social_image / hostedImageUrl
→ social post publishing payload
→ LinkedIn/Facebook publish with image
```

## Test checklist

1. Run the Supabase migration.
2. Approve a `galaxyai_image_prompt`.
3. Run it through GalaxyAI.
4. Refresh/check the GalaxyAI run after completion.
5. Confirm a `generated_social_image` asset is created.
6. Confirm the asset content is an image URL.
7. Confirm the parent social post metadata includes:
   - `generatedSocialImageAssetId`
   - `generatedSocialImageUrl`
   - `hostedImageUrl`
   - `imageReadyForPublishing`

## Suggested commit message

```text
Store completed GalaxyAI social images as VIP assets
```
