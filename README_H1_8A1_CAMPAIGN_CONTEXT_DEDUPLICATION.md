# Marketing VIP H1.8A1 — Campaign Context Deduplication

H1.8A1 fixes a one-off campaign form defect that saved a new hidden strategy-context block on every keystroke.

For example, typing:

```text
When you use AI...
```

could save:

```text
Originality angle: W
Originality angle: Wh
Originality angle: Whe
...
Originality angle: When you use AI...
```

The same issue affected:

- Originality angle
- Objections to address
- Differentiator
- Proof points

## What this patch changes

### Prevents new duplication

The one-off campaign form now updates its visible fields without mirroring each keystroke into hidden strategy context.

Brand Voice shortcuts continue populating the appropriate campaign fields, but do not duplicate the same value into hidden strategy context.

Account Strategy selections and chosen knowledge sources continue to be saved because they contain useful source detail beyond the visible field value.

### Cleans existing campaigns during generation

Already-created campaigns do not need to be deleted or recreated.

Before a one-off asset pack is generated, Marketing VIP now:

1. Removes historical keystroke-snapshot blocks from strategy context.
2. Removes repeated copies of differentiator, proof points, originality angle, and objections from campaign notes supplied to the model.
3. Preserves actual user notes, the selected service line, Account Strategy selections, offer details, audience details, and knowledge context.
4. Uses the final explicit strategy fields as the authoritative values.

The same note cleanup is applied when revising an existing asset.

## Files

Added:

- `src/lib/content-generation/campaign-context-sanitizer.ts`
- `README_H1_8A1_CAMPAIGN_CONTEXT_DEDUPLICATION.md`

Replaced:

- `src/components/campaigns/CampaignWebsiteForm.tsx`
- `src/app/api/campaigns/route.ts`
- `src/app/api/campaigns/[campaignId]/generate/route.ts`
- `src/app/api/assets/[assetId]/revise/route.ts`

## Database changes

None.

Do not run a Supabase migration.

## Environment variables

None.

## Installation

1. Unzip the patch directly into the Marketing VIP repository root.
2. Choose **Replace** when prompted.
3. Commit and push through GitHub Desktop.
4. Confirm the Vercel deployment succeeds.

Suggested commit message:

```text
H1.8A1 fix one-off campaign context duplication
```

## Retest the current campaign

You may reuse the campaign that produced the duplicated context.

1. Open the existing campaign.
2. Generate the Marketing Asset Pack again.
3. Confirm the new output contains only the final originality angle and proof points.
4. Confirm the audience, selected service line, selected offer, and knowledge source remain available to the generator.
5. Confirm the public content does not expose private planning labels.

Previously generated assets will not be edited automatically. Generate a new asset pack or request a new revision after deployment.

## Validation completed

- Repository-wide TypeScript check passed.
- Synthetic keystroke-snapshot cleanup test passed.
- Explicit campaign notes preservation test passed.
- Account Strategy selection preservation test passed.
- New-form static check confirmed that the four manual strategy fields no longer append hidden context on each change.
- Next.js production compilation passed. The local environment timed out after entering the broader build TypeScript/page-data phase; the standalone strict TypeScript check passed, and Vercel remains the final complete deployment check.
