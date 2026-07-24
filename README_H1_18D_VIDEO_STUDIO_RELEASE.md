# H1.18D Unified Video Studio Release Hardening

## Purpose

H1.18D prepares the Unified Video Studio for controlled acceptance and production activation without changing the existing Luma, Magica/GalaxyAI, campaign, approval, publishing, or analytics data models.

## Included

- Credential-aware Luma and Magica controls without exposing provider secrets to the browser.
- Authenticated, no-cache provider-readiness endpoint returning booleans only.
- Package-generation and render APIs return `503` before execution when the selected provider is unavailable.
- Mobile-safe full-width primary actions, minimum touch heights, responsive form columns, text wrapping, and live success/error feedback.
- Explicit production opt-in retained; the H1.18 preview branch remains enabled automatically.
- Final activation, provider, responsive, and API-boundary regression coverage.
- No database migration.

## Automated validation

Run:

- `npm run test:video-studio`
- `npm run test:navigation`
- `npm run typecheck`
- `npm run build`

The Video Studio validation workflow runs the same targeted tests and production build for pull requests that change Video Studio, Campaign Workspace integration, navigation, or release tests.

## Acceptance checklist

Complete this checklist on the green preview deployment before production activation.

### Master account

1. Open Video Studio from desktop navigation and mobile navigation.
2. Confirm only configured providers are selectable.
3. Create a campaign-to-video package from an approved Marketing Spine.
4. Create an ad-to-video package from an approved Ad Studio package.
5. Confirm both packages enter the existing approval queue in `needs_review`.
6. Confirm rendering is blocked before approval.
7. Approve one package and start the configured provider.
8. Confirm provider status, review state, source package, and Campaign Video lane remain linked.
9. Confirm Media Provider administration remains master-only.

### Normal account

1. Confirm Video Studio and the Campaign Video lane are visible only when the feature is enabled.
2. Confirm account-scoped campaigns, ads, packages, and provider runs are visible.
3. Confirm another account's sources and assets cannot be selected or opened.
4. Confirm viewers cannot generate packages or start provider renders.
5. Confirm owners/admins can generate, approve, and render within their account permissions.
6. Confirm desktop, tablet, and narrow mobile controls remain usable without horizontal overflow.

### Existing-system regression

1. Campaign Workspace stages and Campaign Advertising lane still load.
2. Approval, revision, archive, publishing, and analytics safeguards remain unchanged.
3. Existing direct Luma routes and Luma scene continuation remain available.
4. Existing Magica/GalaxyAI workflow provisioning, webhooks, recovery, and run history remain available.
5. Ad Studio generation and approved exports remain available.

## Production activation

After the acceptance checklist passes:

1. Confirm `LUMA_API_KEY` and/or `MAGICA_API_KEY` or `GALAXYAI_API_KEY` are configured in Production.
2. Confirm at least one active Magica video workflow exists when Magica will be offered.
3. Set `ENABLE_VIDEO_STUDIO=true` in the Production environment. `NEXT_PUBLIC_ENABLE_VIDEO_STUDIO=true` may also be set for configuration consistency.
4. Merge PR #7 using squash merge so H1.18 lands as one release commit.
5. Confirm the production deployment is green.
6. Repeat the master-account and normal-account smoke checks.

## Rollback

Set `ENABLE_VIDEO_STUDIO=false` and `NEXT_PUBLIC_ENABLE_VIDEO_STUDIO=false`, then redeploy. Video Studio navigation, routes, APIs, and the Campaign Video lane become unavailable without deleting generated packages, approval history, Luma runs, or Magica/GalaxyAI runs.
