# H1.18B Video Generation and Provider Execution

## Purpose

H1.18B turns the provider-neutral foundation into a working campaign-to-video and ad-to-video workflow while preserving the existing approval and provider systems.

## Included

- Campaign-to-video package generation from a current approved Marketing Spine.
- Approved Ad Studio package-to-video generation with source, CTA, attribution, strategy, and research lineage.
- Model-generated 20-second concepts with script, voiceover, and four five-second scenes.
- Landscape, vertical, and square package formats.
- Video packages stored as standard generated assets in `needs_review`.
- Luma packages stored as `video_script` assets.
- Magica packages stored as `galaxyai_prompt` assets for compatibility with current workflow infrastructure.
- Approval-gated direct Luma render start.
- Approval-gated Magica workflow execution through the existing Magica/GalaxyAI-compatible client.
- Existing Luma and Magica run tables, webhooks, recovery, and provider history preserved.
- Unified Video Studio creation and render controls.

## Safety boundary

- Provider rendering cannot start until the Video Studio package is approved.
- Ad-to-video requires an approved Ad Studio package.
- Campaign-to-video revalidates the approved Marketing Spine and its captured strategy context.
- Existing provider administration remains master-only.
- No database migration is required.
- No publishing or distribution occurs automatically.

## Validation

- `npm run test:video-studio`
- `npm run test:navigation`
- `npm run typecheck`
- `npm run build`

## Rollback

Set `ENABLE_VIDEO_STUDIO=false` or `NEXT_PUBLIC_ENABLE_VIDEO_STUDIO=false` and redeploy. Existing generated packages and provider runs remain intact.
