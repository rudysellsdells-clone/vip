# Marketing VIP H1.8B — One-Off Marketing Spine Approval Gate

## Purpose

H1.8B brings the successful monthly review-before-execution pattern into one-off campaigns.

The existing one-off campaign form is unchanged. After the campaign is created, Marketing VIP now:

1. Generates a private campaign strategy.
2. Saves the strategy with the campaign.
3. Lets the user review and edit every strategy section.
4. Requires explicit approval and locking.
5. Blocks asset and Luma video generation until the approved strategy is current.
6. Generates content from the approved strategy plus verified facts instead of the raw Brand Voice, Account Strategy, notes, knowledge summaries, or field-label dump.

## Prerequisites

Install H1.8A and H1.8A1 first. This patch was built on top of those versions and uses their campaign-intelligence and context-sanitizing layers.

## No Supabase migration

H1.8B stores the approval gate inside the existing `campaigns.strategy` JSON field.

Do not run SQL for this patch.

## Installation

1. Back up the repository or create a Git branch.
2. Unzip the patch directly into the repository root—the folder containing `package.json`, `src`, and `public`.
3. Choose **Replace** when Windows asks about existing files.
4. Review the changes in GitHub Desktop.
5. Commit with a message such as:

   `H1.8B one-off Marketing Spine approval gate`

6. Push to GitHub and watch the Vercel deployment.

## User workflow

### New or existing one-off campaign

1. Open the campaign detail page.
2. Click **Generate Campaign Strategy**.
3. Review the generated Marketing Spine.
4. Edit any section that is generic, inaccurate, copied from settings, or strategically weak.
5. Click **Save Draft** when needed.
6. Click **Approve and Lock Strategy**.
7. Click **Generate Asset Pack From Approved Strategy**.

Existing assets remain untouched. Older campaigns simply need a strategy generated and approved before generating a new asset pack.

### Revising an approved strategy

1. Click **Reopen Strategy for Revision**.
2. Edit or regenerate the strategy.
3. Approve it again.
4. Generate a new asset pack when desired.

Previously generated assets are not silently overwritten.

## Strategy sections

The AI fills these sections automatically; they are review fields, not additional campaign-creation requirements:

- Campaign objective
- Target audience
- Buyer situation
- Core problem
- Business consequence
- Campaign point of view
- Offer explanation
- Offer deliverables
- Proof and support
- Objections and response
- Message progression
- Primary CTA
- Channel direction

## Clean context boundary

After approval, the asset-writing prompt receives:

- The approved Marketing Spine
- Supported offer facts
- Supported deliverables
- Approved proof
- The approved CTA
- The existing tone constraint

It does not receive the raw:

- Brand Voice field collection
- Account Strategy field collection
- Campaign notes dump
- Knowledge-source summaries
- Service-line lists
- Buyer-segment lists
- Offer lists
- Internal field labels

The approved strategy is the source of truth.

## Server-side enforcement

The browser is not the only gate. The server rejects asset generation when:

- No H1.8B strategy exists
- The strategy is still a draft
- Campaign inputs changed after approval
- A stale tab tries to generate from an outdated strategy

Luma one-off video generation follows the same approval requirement.

## Asset queue cleanup

New one-off generations no longer add duplicate internal assets for:

- Campaign Strategy
- Audience Angle
- Core Message

Those are represented by the approved Marketing Spine. The generated queue contains the execution assets that need review.

## Model behavior

Strategy generation is a separate AI call focused only on the campaign argument. It does not write the campaign assets during this step.

Optional environment overrides:

```text
OPENAI_STRATEGY_MODEL=gpt-4.1-mini
OPENAI_ASSET_PACK_MODEL=gpt-4.1-mini
VIP_STRATEGY_OPENAI_TIMEOUT_MS=22000
```

No new environment variable is required. If the strategy call fails, VIP creates a safe deterministic draft for human review. If the later asset call fails, the fallback asset pack is built from the approved strategy rather than generic raw settings.

## Marketing VIP logo

The official Marketing VIP logo supplied by Rudy is included in the authenticated application header in this build.

## Recommended acceptance test

1. Open an existing one-off campaign.
2. Confirm its existing assets are still visible.
3. Confirm asset generation is unavailable until strategy approval.
4. Generate the strategy.
5. Confirm the fields are populated without requiring new setup inputs.
6. Edit one sentence and save the draft.
7. Approve the strategy.
8. Generate the asset pack.
9. Confirm no new `Campaign Strategy`, `Audience Angle`, or `Core Message` assets appear in the asset list.
10. Confirm email, LinkedIn, Facebook, YouTube, video, and GalaxyAI assets follow the approved argument.
11. Search the outputs for copied labels or generic field phrases from Brand Voice and Account Strategy.
12. Reopen the strategy and confirm generation relocks until it is approved again.
13. Confirm the Marketing VIP logo appears in the authenticated header.

## Validation completed

- Repository-wide `tsc --noEmit` passed.
- Next.js production compilation passed with both Turbopack and webpack.
- Focused strategy-gate runtime tests passed.
- Approved-prompt raw-memory exclusion test passed.
- Source-signature stability test passed.
- Approved-strategy fallback inheritance test passed.
- Existing-campaign compatibility was preserved by storing the gate in `campaigns.strategy`.
- No database migration was added.

The local full Next.js command did not exit before the isolated environment timeout after successful compilation and the separate TypeScript pass. Vercel remains the definitive full deployment test.
