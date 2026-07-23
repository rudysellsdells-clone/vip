# H1.18A Unified Video Studio Foundation

## Purpose

H1.18A begins Release C by placing a provider-neutral Video Studio above the existing Luma and Magica/GalaxyAI systems. It does not replace either provider path and does not start new renders yet.

## Included

- Protected `/video-studio` preview route.
- Branch-aware `ENABLE_VIDEO_STUDIO` and `NEXT_PUBLIC_ENABLE_VIDEO_STUDIO` feature boundary.
- Canonical video package, source-lineage, shot-list, render-status, and review-status contract.
- Provider registry for direct Luma and managed Magica execution.
- Compatibility normalizers for existing `luma_video_runs` and `galaxyai_runs` rows.
- Account-scoped read-only history across both providers.
- Campaign-to-video and ad-to-video source-lane definitions.
- Focused feature, contract, and provider tests.

## Existing systems preserved

- Luma direct generation and scene-extension routes.
- Magica API access through the existing GalaxyAI-compatible client.
- GalaxyAI workflow provisioning, approved prompt assets, webhooks, recovery, and run history.
- Existing generated-asset review, approval, archive, publishing, and analytics behavior.

## Safety boundary

H1.18A does not:

- Start Luma or Magica renders from Video Studio.
- Add or modify provider credentials.
- Publish or distribute a video.
- Bypass Marketing Spine or generated-asset approval.
- Change database tables or RLS policies.
- Enable Video Studio in production.

## Validation

- `npm run test:video-studio`
- `npm run test:navigation`
- `npm run typecheck`
- `npm run build`

## Rollback

Set `ENABLE_VIDEO_STUDIO=false` or `NEXT_PUBLIC_ENABLE_VIDEO_STUDIO=false` and redeploy. The navigation entry and direct workspace route remain unavailable. Existing Luma and Magica records are untouched.
