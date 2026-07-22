# H1.16 Campaign Workspace

## Purpose

H1.16 turns campaign management into one guided workspace instead of a collection of disconnected campaign, strategy, asset, review, and execution screens.

## Workflow

Every campaign is evaluated across five deterministic stages:

1. **Brief** — campaign audience, offer, goal, CTA, channels, and supporting context.
2. **Strategy** — campaign-specific Marketing Spine generation and approval.
3. **Assets** — asset pack and campaign video generation.
4. **Review** — asset approval, revision, or rejection.
5. **Execution** — publishing, sending, export, or other activation of approved assets.

## User experience

- Campaign library cards show calculated workspace progress.
- Each card displays the next required action.
- Campaign detail pages include a five-stage progress rail.
- The hero action points to the exact next workflow section.
- Stale Marketing Spine state is shown as requiring attention.
- Downstream stages remain visibly locked until their prerequisites are complete.
- Existing generation, approval, asset, Luma, and deletion controls are reused.

## Stage rules

- A created campaign has a completed Brief stage.
- Strategy is complete only when the Marketing Spine is approved and not stale.
- Assets remain locked until Strategy is complete.
- Review remains locked until assets exist.
- Execution remains locked until asset review is complete and approved or executed assets exist.
- Published and sent assets count as executed work.

## Database impact

No migration is required. H1.16 derives workspace state from existing campaign strategy and generated asset records.

## Release order

H1.16 is stacked on H1.15 and should be released after:

1. H1.14 Strategy Workspace.
2. H1.15 Market Intelligence.
3. H1.16 Campaign Workspace.

## Validation

- Verify campaign library progress for campaigns in different states.
- Open a campaign and confirm the recommended action links to the correct section.
- Confirm stale strategy blocks Assets.
- Confirm approved strategy with no assets advances to Asset Pack generation.
- Confirm needs-review assets advance to Review.
- Confirm approved assets advance to Execution.
- Confirm published or sent assets complete Execution.
- Run `npm run test:campaign-workspace`.
- Run the production build.

## Rollback

H1.16 adds no tables and changes no existing stored campaign data. Rollback consists of reverting the H1.16 UI, helper, and test commits.
