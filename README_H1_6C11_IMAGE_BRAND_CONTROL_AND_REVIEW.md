# H1.6C11 — Image Brand Control + Visual Review Workflow

## Purpose

This patch tightens Marketing VIP image generation so generated images support the brand without inventing random logo marks, badges, emblems, text overlays, fake UI labels, or decorative marks that look like logos.

It also adds a visual workflow that matches the rest of the content review process:

- Add custom image direction before generation.
- Generate an image for review.
- Approve the image.
- Reject the image.
- Regenerate from an existing image card.
- Select the approved image as the primary publish image.

## Files Changed

```text
src/components/assets/VisualAssetPanel.tsx
src/lib/visual-assets/prompt-builder.ts
src/app/api/assets/[assetId]/visuals/route.ts
src/app/api/assets/[assetId]/visuals/[visualAssetId]/review/route.ts
```

## What Changed

### 1. Strong no-logo image rules

The OpenAI image prompt now explicitly says not to include:

- logos
- fake logos
- logo-like marks
- badges
- seals
- monograms
- watermarks
- brand stamps
- random emblems
- readable text
- fake UI words
- slogans
- text overlays

The brand colors can still influence the image, but the logo itself should not be placed inside the generated image.

### 2. Added additional image direction

The Visual Assets panel now has an **Additional image direction** textarea above the Generate Image button.

That input is sent to the image generation API and saved in the generated visual metadata.

### 3. Generated images now require review

New images are saved as reviewable visual assets instead of automatically becoming the primary publish image.

### 4. Approve / Reject / Regenerate controls

Each generated visual card now includes:

- Approve
- Reject
- Regenerate
- Use as Primary
- Download

Approving a visual also selects it as the primary publish image.

Rejecting a primary visual clears it from the parent asset's publish metadata.

## SQL Required

No SQL is required.

## Testing

1. Open an approved content asset.
2. Scroll to **Visual assets**.
3. Add image direction, such as:

```text
Show a dental practice owner looking at a clean search visibility report. Use a premium blue and gold palette. No logos, no text overlays, no fake UI labels.
```

4. Generate the image.
5. Confirm the image does not include random logos or readable text.
6. Approve, reject, and regenerate images from the visual cards.
7. Confirm an approved visual becomes the primary image for publishing.
