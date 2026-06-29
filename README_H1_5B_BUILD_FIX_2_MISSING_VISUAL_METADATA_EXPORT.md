# H1.5B Build Fix 2 — Missing Visual Metadata Export

This is a tiny build-fix patch for this Vercel error:

`Module '"@/lib/visual-assets/metadata"' has no exported member 'buildPublishingImageMetadataFromVisual'.`

## What happened

The H1.5B visual routes started importing `buildPublishingImageMetadataFromVisual`, but the matching update to:

- `src/lib/visual-assets/metadata.ts`

did not land in the deployed repo.

## What this fixes

This patch adds the missing helper export. That helper mirrors the selected primary visual into the source asset metadata so the publishing payload can include the image URL.

## SQL required

None.

## Apply order

1. Apply this ZIP over H1.5B and the previous H1.5B build fix.
2. Redeploy in Vercel.
