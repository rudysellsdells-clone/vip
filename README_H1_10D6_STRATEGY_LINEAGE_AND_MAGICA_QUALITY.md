# H1.10D6 — Strategy Lineage Truth + Magica Quality Guard

## What this patch corrects

### 1. Asset strategy-lineage display

The asset page previously treated missing `marketingSpine` metadata on the current row as proof that no Marketing Spine was used. That conclusion was too strong.

The page now looks for strategy evidence in this order:

1. the current asset
2. the parent/source asset
3. the campaign record
4. an approved one-off campaign strategy record

When a Marketing Spine is found, the page shows where it came from. When an approved one-off strategy is found, it identifies that strategy type accurately. When no audit metadata is found anywhere, the page now says the metadata was not attached rather than claiming strategy was not used.

### 2. Strategy metadata inheritance for Magica outputs

New Magica-generated assets now inherit strategy-lineage fields from the approved source prompt, including:

- `marketingSpine`
- `assetBrief`
- `strategyInheritancePath`
- approved one-off campaign strategy fields

This keeps the strategy chain of custody visible on generated outputs.

### 3. Higher-quality image and video execution prompts

VIP now applies a deterministic quality envelope immediately before starting a Magica run.

Image prompts require:

- one coherent scene and clear focal subject
- realistic anatomy, faces, hands, perspective, lighting, shadows, reflections, and edges
- no invented logos, metrics, dashboards, awards, claims, or testimonials
- no duplicated people, fused limbs, floating objects, warped faces, impossible geometry, garbled text, or unrelated details

Video prompts require:

- exactly 15 seconds
- preservation of the source image's people, identity, anatomy, objects, layout, text, and background
- subtle realistic motion only
- no cuts, morphing, melting, flicker, jitter, duplicated limbs, new objects, changing text, camera jumps, or background hallucinations
- a stable final hold

The existing single-field Magica workflow receives a combined image-and-video quality prompt below Seedance's safe limit. A future two-field workflow receives specialized FLUX and Seedance prompts.

## Workflow impact

No Magica reprovisioning is required. Deploy the patch and rerun the approved asset prompt.

Previously generated media will not change; a new run is required to apply the stronger prompt.

## Validation

- 13 GalaxyAI/Magica targeted tests passed
- changed TypeScript and TSX files passed esbuild syntax compilation
- prompt length limits remain enforced for FLUX and Seedance

A complete Next.js production build was not run in the patch workspace because repository dependencies were not installed there.
