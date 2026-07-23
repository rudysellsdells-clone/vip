# H1.17A Ad Studio Foundation

## Purpose

H1.17 begins the unfinished advertising portion of Release B in the approved Marketing VIP release plan. It introduces a protected Ad Studio workspace without changing campaign generation, generated-asset persistence, approvals, publishing, or analytics behavior.

## Existing foundations reused

- Strategy Foundation and approved Brand Voice
- Approved Market Intelligence findings and campaign snapshots
- Campaign Workspace and Marketing Spine approval
- Generated asset review, revision, approval, and archive controls
- UTM taxonomy support for `paid-social`, `cpc`, `display`, `search_ad`, and `display_ad`
- Account-scoped analytics and publishing history

## Included in H1.17A

- Server-safe `ENABLE_AD_STUDIO` and `NEXT_PUBLIC_ENABLE_AD_STUDIO` feature evaluation
- Automatic Ad Studio visibility on the `h1-17-ad-studio` preview branch
- Explicit `false` override for emergency rollback
- Protected `/ad-studio` route
- Ad Studio navigation entry through the existing feature registry
- Production Research navigation correction so Market Intelligence and its navigation use the same default-on release state
- Focused feature-gate tests

## Safety boundary

This slice does not:

- Generate advertising copy
- Create or modify database records
- Publish to Google, Meta, LinkedIn, or other advertising platforms
- Add unfinished APIs
- Bypass quality review or approval safeguards
- Change current campaign or publishing contracts

## Planned H1.17 sequence

1. **Ad package contract and campaign handoff**
   - Canonical package, channel, variant, destination, strategy snapshot, evidence, and attribution types
2. **Google Search package generation**
   - Responsive search ad copy, keyword themes, negative-keyword guidance, extensions, and landing-page alignment
3. **Paid Social package generation**
   - Meta and LinkedIn primary text, headlines, CTA variants, audience framing, and creative direction
4. **Scoring and review integration**
   - Brand, strategy, clarity, policy-risk, destination, and evidence checks using existing approval controls
5. **UTM and export packages**
   - Tracked URLs plus structured CSV and copy-ready exports
6. **Campaign Workspace integration**
   - Ads stage, readiness, next action, and package status
7. **Regression and release validation**
   - Master and normal accounts, mobile navigation, direct routes, account isolation, approvals, and production build

## Validation

- Run `npm run test:ad-studio`.
- Run `npm run test:navigation`.
- Run `npm run typecheck`.
- Run `npm run build`.
- Confirm `/ad-studio` is available on the H1.17 preview branch.
- Confirm `/ad-studio` returns not found when explicitly disabled.
- Confirm Research remains visible in production unless Market Intelligence is explicitly disabled.
- Confirm Ad Studio remains hidden in production until intentionally enabled.

## Rollback

Set `ENABLE_AD_STUDIO=false` or `NEXT_PUBLIC_ENABLE_AD_STUDIO=false` and redeploy. The navigation item and direct route become unavailable. No data cleanup is required because H1.17A creates no database records.
