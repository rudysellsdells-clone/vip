# H1.5A — Visual Asset Generation, Storage, and Selection

This patch adds the first production-ready visual asset workflow to Marketing VIP.

## What it adds

- OpenAI image generation from approved assets
- Account-scoped visual generation routes
- Storage in the existing `campaign-assets` Supabase bucket
- Generated visual records in `generated_assets`
- Visual asset gallery on the asset detail page
- Download links for generated images
- Regenerate flow by creating additional variants
- Primary image selection for later publishing
- Source asset metadata updates for publishing readiness

## New UI

Open an approved asset at:

`/assets/[assetId]`

You will now see a **Visual assets** panel where you can:

- choose image use: social, LinkedIn, Facebook, blog hero, or email banner
- generate an image
- preview stored image variants
- download an image
- choose the primary image for publishing

## New API routes

- `POST /api/assets/[assetId]/visuals`
- `POST /api/assets/[assetId]/visuals/[visualAssetId]/primary`

## New files

- `src/lib/visual-assets/metadata.ts`
- `src/lib/visual-assets/openai-image.ts`
- `src/lib/visual-assets/prompt-builder.ts`
- `src/lib/visual-assets/storage.ts`
- `src/components/assets/VisualAssetPanel.tsx`
- `src/app/api/assets/[assetId]/visuals/route.ts`
- `src/app/api/assets/[assetId]/visuals/[visualAssetId]/primary/route.ts`
- `db/migrations/20260629_h1_5a_visual_assets_storage.sql`

## Modified files

- `.env.example`
- `src/app/(app)/assets/[assetId]/page.tsx`

## Required environment

The app already uses `OPENAI_API_KEY` for text generation. H1.5A uses the same key for image generation.

Optional environment overrides:

```env
OPENAI_IMAGE_MODEL=gpt-image-1
OPENAI_IMAGE_SIZE=1024x1024
OPENAI_IMAGE_WIDE_SIZE=1024x1024
OPENAI_IMAGE_QUALITY=
```

## Required SQL

Run:

`db/migrations/20260629_h1_5a_visual_assets_storage.sql`

This safely ensures the public `campaign-assets` storage bucket exists.

## Notes

- No publishing execution logic is changed in H1.5A.
- Generated images are stored and selected for future publishing use.
- H1.5B should attach the selected primary image to Facebook, LinkedIn, WordPress, and other publish routes.
