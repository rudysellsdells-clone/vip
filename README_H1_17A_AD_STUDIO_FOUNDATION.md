# H1.17 Ad Studio MVP

## Purpose

H1.17 completes the advertising portion of Release B in the approved Marketing VIP release plan. It turns approved campaign strategy into reviewable Google Search, Meta, and LinkedIn advertising packages while reusing the platform's existing account isolation, Marketing Spine approval, Market Intelligence, asset review, analytics, and attribution systems.

## Existing foundations reused

- Strategy Foundation and approved Brand Voice
- Approved Market Intelligence findings and campaign snapshots
- Campaign Workspace and Marketing Spine approval
- Generated asset review, revision, approval, archive, and history controls
- UTM taxonomy support for `paid-social`, `cpc`, `display`, `search_ad`, and paid social asset types
- Account-scoped analytics and publishing history

## Included in H1.17

### Feature and route boundary

- Server-safe `ENABLE_AD_STUDIO` and `NEXT_PUBLIC_ENABLE_AD_STUDIO` evaluation
- Automatic Ad Studio visibility on the `h1-17-ad-studio` preview branch
- Explicit `false` override for emergency rollback
- Protected navigation, `/ad-studio` route, generation APIs, and export API
- Production Research navigation correction so Market Intelligence and its sidebar entry share the same release state

### Canonical advertising package

- Account, campaign, objective, audience, offer, destination, channel, and attribution context
- Approved Marketing Spine, Strategy Foundation, and Market Intelligence signatures
- Evidence-source traceability
- Google Search, Meta, and LinkedIn channel mappings
- Generation-readiness validation before AI execution

### Google Search

- Three distinct responsive-search-ad concepts
- Headlines, descriptions, keyword themes, negative-keyword guidance, paths, callouts, and sitelinks
- Deterministic character-limit enforcement
- Final destination validation and CPC attribution
- Storage as a standard `search_ad` asset in `needs_review`

### Paid Social

- Meta and LinkedIn package generation
- Four concept angles: direct response, problem aware, credibility led, and educational
- Primary text, headline, description, CTA, audience frame, and image creative brief
- Platform-specific display guardrails
- Storage as standard paid `facebook_post` or `linkedin_post` assets in `needs_review`

### Scoring and exports

- Deterministic 100-point readiness score covering:
  - Completeness
  - Platform fit
  - Strategy traceability
  - Attribution readiness
  - Variant diversity
- Tracked landing URLs that preserve existing query parameters
- Account-protected JSON and CSV exports
- Export requires the asset to be approved
- Export events are recorded in activity history

### Campaign Workspace connection

- Campaign-level advertising lane without changing the accepted five-stage workspace
- Package counts, review counts, approved counts, average score, and next action
- Campaign-specific handoff into Ad Studio with the originating campaign preselected
- Approved package downloads available from both Ad Studio and the campaign lane

## Safety boundary

H1.17 does not:

- Publish directly to Google Ads, Meta Ads Manager, LinkedIn Campaign Manager, or another advertising provider
- Create budgets, bids, provider audiences, or live campaigns
- Bypass Marketing Spine approval, asset review, or explicit approval
- Replace existing content, publishing, or analytics contracts
- Require a database migration

Ad Studio records use the existing `generated_assets`, activity history, campaign, analytics, and account-security structures.

## Validation completed

The permanent `Ad Studio Validation` pull-request workflow runs:

- `npm run test:ad-studio`
- `npm run test:navigation`
- `npm run typecheck`
- `npm run build`

H1.17 passed:

- Six focused Ad Studio test files
- Navigation regression tests
- TypeScript validation
- Full Next.js production build
- Vercel preview deployment

## User acceptance checklist

- Open Ad Studio on desktop and mobile.
- Confirm the correct campaign is preselected when entering from a Campaign Workspace.
- Generate one Google Search package from an approved campaign.
- Generate one Meta or LinkedIn package from an approved campaign.
- Confirm both assets enter Needs Review.
- Open and review the generated package contents and score.
- Approve one package.
- Confirm CSV and JSON downloads remain blocked before approval and work after approval.
- Confirm the tracked URL contains the expected account UTM taxonomy.
- Confirm another account cannot view or export the package.

## Production activation

Ad Studio remains hidden in production until intentionally enabled. After acceptance passes, set one of the following in the production environment and redeploy:

```text
ENABLE_AD_STUDIO=true
```

or

```text
NEXT_PUBLIC_ENABLE_AD_STUDIO=true
```

Prefer the server flag when possible.

## Rollback

Set `ENABLE_AD_STUDIO=false` or `NEXT_PUBLIC_ENABLE_AD_STUDIO=false` and redeploy. Navigation, direct routes, generation APIs, campaign advertising lanes, and export APIs become unavailable. Existing generated ad assets remain stored and continue to follow normal asset permissions and history controls.
