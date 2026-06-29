# H1.5B — Publish Selected Visuals with VIP Posts

This patch wires the **primary visual selected in H1.5A** into VIP's publishing flow.

## What this adds

- The selected primary image is now mirrored into canonical publish-ready metadata on the source asset.
- Facebook and LinkedIn publishing payloads now pick up that selected image automatically.
- WordPress payloads now include featured/hero image fields when a primary visual is selected.
- Gmail draft payloads now include banner/image fields when a primary visual is selected.
- Publishing preflight now warns when a publishable asset does **not** have a selected image.
- The **Publishing Ready** screen now shows the exact primary image VIP will send.

## Behavior change

After you generate images from an approved asset and click **Use as Primary**:

- VIP stores the chosen image URL back onto the source asset metadata.
- VIP includes image fields like:
  - `hosted_image_url`
  - `image_url`
  - `media_url`
  - `generated_social_image_asset_id`
- Social publishing routes can now send the post copy **and** the selected image together.

## Files included

- `src/lib/visual-assets/metadata.ts`
- `src/app/api/assets/[assetId]/visuals/route.ts`
- `src/app/api/assets/[assetId]/visuals/[visualAssetId]/primary/route.ts`
- `src/lib/publishing/output-payload.ts`
- `src/lib/publishing/publishing-preflight.ts`
- `src/app/(app)/publishing-ready/page.tsx`

## SQL required

None.

## Validation

- `npm run typecheck` ✅
- `next build` compiles successfully through the build + TypeScript phase in the container.

## Notes

This patch assumes H1.5A is already installed and working.
If your database originally rejected `status = 'stored'`, keep the prior H1.5A status-fix migration applied.
