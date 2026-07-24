# H1.18C Video Review, Status, Usage, and Campaign Integration

## Purpose

H1.18C connects the Unified Video Studio to the accepted asset-review workflow and Campaign Workspace while preserving the existing Luma and Magica provider records.

## Included

- Canonical mapping from generated-asset decisions into Video Studio review states.
- Provider-run review reconciliation through each Video Studio package's stored render lineage.
- Workspace-level provider usage counts for total, Luma, Magica, active, completed, and failed attempts.
- Campaign-level video readiness covering package creation, review, approved render start, active rendering, failure attention, and completed output.
- Campaign Video lane added after the existing Campaign Advertising lane.
- Campaign-to-Video Studio handoff with the originating campaign moved to the first selectable source.
- Active generated-asset filtering so archived video packages do not remain in the operational workspace.
- Focused readiness and usage regression tests.

## Safety boundary

- Existing asset approval actions remain authoritative.
- Provider rendering still requires an approved Video Studio package.
- Luma and Magica run tables remain unchanged.
- Existing provider webhooks, sync, recovery, and output records remain intact.
- No database migration is required.
- Video Studio remains feature-gated and hidden in production until activation.

## Validation

- `npm run test:video-studio`
- `npm run test:navigation`
- `npm run typecheck`
- `npm run build`

## Rollback

Set `ENABLE_VIDEO_STUDIO=false` or `NEXT_PUBLIC_ENABLE_VIDEO_STUDIO=false` and redeploy. The Campaign Video lane, Video Studio route, and APIs become unavailable without deleting video packages, review history, or provider runs.
