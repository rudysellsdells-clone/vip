# H1.15 Market Intelligence Release

## Purpose

H1.15 introduces an account-scoped, approval-controlled Market Intelligence system. It keeps external research separate from account-owned business truth while allowing approved findings to inform Strategy and campaign planning.

## Dependencies

H1.15 is stacked on H1.14 Strategy Workspace and should be released after H1.14.

## Release order

1. Merge and deploy H1.14 Strategy Workspace.
2. Apply `db/migrations/20260722_h1_15_market_intelligence_foundation.sql`.
3. Confirm the three new tables and RLS policies exist:
   - `market_research_projects`
   - `market_research_sources`
   - `market_research_findings`
4. Set `NEXT_PUBLIC_ENABLE_MARKET_INTELLIGENCE=true` in the intended Vercel environment.
5. Redeploy.
6. Verify the Research navigation item and `/research` route.

Do not enable the feature flag before the migration is applied.

## Validation checklist

### Access

- A user without an active workspace cannot access Market Intelligence.
- Viewers can read research but cannot create or approve it.
- Account owners and admins can create projects, sources, and findings.
- Project IDs and cited source IDs are rejected when they belong to another account.

### Research workflow

- Create an active research project.
- Add a cited source with publisher, URL, publication date, retrieval date, and credibility score.
- Create a draft competitor, search-demand, opportunity, audience, trend, risk, or proof finding.
- Approve the finding.
- Confirm the approved finding appears in Strategy → Messaging & Proof.
- Reject or return the finding to draft and confirm it disappears from approved Strategy context.

### Campaign integrity

- Generate a Marketing Spine with an approved finding present.
- Change, reject, or replace the approved finding.
- Attempt to create the campaign from the old Marketing Spine.
- Confirm VIP requires regeneration because the approved intelligence signature changed.
- Regenerate and approve the Marketing Spine.
- Create the campaign.
- Confirm the campaign strategy contains an immutable Market Intelligence snapshot and signature.

## Feature boundaries

- Draft and rejected findings never enter Strategy or campaign generation.
- Approved findings are private planning context and should not be copied verbatim into public content.
- Citations are stored with the snapshot for traceability.
- Market Intelligence is optional and does not lower Strategy readiness when no research exists.
- Production behavior remains unchanged while the feature flag is disabled.

## Rollback

1. Set `NEXT_PUBLIC_ENABLE_MARKET_INTELLIGENCE=false`.
2. Redeploy.
3. The navigation item, page, APIs, Strategy integration, and campaign integration become inactive.
4. Existing research records remain stored for later reactivation.

The migration should not be rolled back unless the stored research data is intentionally being removed.
