# H1.5B Build Fix — Missing Publishing Image Export

This is a tiny build-fix patch for this Vercel error:

`Module '"@/lib/publishing/output-payload"' has no exported member 'publishingImageForAsset'.`

## What happened

The H1.5B Publishing Ready page started importing `publishingImageForAsset`, but the matching update to `src/lib/publishing/output-payload.ts` did not land in the deployed repo.

## What this fixes

This patch updates:

- `src/lib/publishing/output-payload.ts`

It adds the missing exported helper and keeps the H1.5B publish payload behavior for selected primary images.

## SQL required

None.

## Apply order

1. Apply this ZIP over H1.5B.
2. Redeploy in Vercel.
