# Marketing VIP H1.8B2 — True Pre-Creation Marketing Spine Gate

## Why this patch exists

H1.8B added a strategy approval panel after a one-off campaign row had already been created. That left the order of operations backwards and allowed campaign creation before strategy approval. H1.8B1 removed invalid strategy lifecycle values from `campaigns.status`, but it did not change the original create-first workflow.

H1.8B2 replaces that flow completely for new one-off campaigns.

## Corrected order of operations

1. Complete the existing one-off campaign brief.
2. Click **Generate Campaign Strategy**.
3. Marketing VIP generates the Marketing Spine in memory.
4. Review and edit the strategy.
5. Click **Approve Strategy and Create Campaign**.
6. Only then does Marketing VIP insert the campaign row.
7. The campaign opens with an approved and locked Marketing Spine.
8. Content asset generation is unlocked from that approved strategy.

The strategy-preview request performs no insert or update against `public.campaigns`.

## Campaign status constraint fix

The final campaign insert intentionally does not supply a `status` value. Supabase applies the existing permitted database default, normally `draft`.

This prevents application code from sending strategy-specific lifecycle values into the legacy `campaigns_status_check` constraint.

The separate strategy state remains inside:

```text
campaigns.strategy.oneOffStrategyGate
```

## Server-side enforcement

The campaign creation endpoint now rejects creation unless all of these are true:

- A Marketing Spine preview was generated.
- The user explicitly approved it.
- Required strategy sections are complete.
- The strategy workflow version matches.
- The active workspace is the same workspace used for the preview.
- The campaign brief has not changed since strategy generation.
- The selected service line and offer still belong to the active workspace.

A direct request to `/api/campaigns` without an approved strategy will return HTTP 409 and will not insert a campaign.

## Existing campaigns

Existing campaigns are preserved. Older one-off campaigns can still use the campaign-detail strategy panel to generate, revise, and approve a Marketing Spine. That compatibility route also keeps `campaigns.status` untouched.

## Installation

1. Back up or commit any local changes.
2. Unzip the patch directly into the repository root.
3. Choose **Replace** when Windows asks.
4. Do not run a Supabase migration.
5. Commit and push through GitHub Desktop.
6. Wait for Vercel deployment to complete.

Suggested commit message:

```text
H1.8B2 true pre-creation Marketing Spine gate
```

## Test procedure

1. Open **Campaigns**.
2. Complete a one-off campaign brief.
3. Click **Generate Campaign Strategy**.
4. Confirm the campaign does not appear in Recent Campaigns yet.
5. Review and edit the Marketing Spine.
6. Change one original brief field and confirm approval becomes blocked as stale.
7. Regenerate the strategy.
8. Click **Approve Strategy and Create Campaign**.
9. Confirm the new campaign opens with the strategy already approved and locked.
10. Generate the asset pack.
11. Confirm no `campaigns_status_check` error appears.

## Files included

- `src/app/(app)/campaigns/page.tsx`
- `src/app/api/campaigns/route.ts`
- `src/app/api/campaigns/strategy-preview/route.ts`
- `src/app/api/campaigns/[campaignId]/strategy/route.ts`
- `src/components/campaigns/CampaignWebsiteForm.tsx`
- `src/components/campaigns/OneOffStrategyApprovalPanel.tsx`
- `src/lib/content-generation/one-off-campaign-create.ts`
- `src/lib/content-generation/one-off-strategy-form.ts`

## Validation completed

- Repository-wide `tsc --noEmit` passed.
- Next.js webpack production compilation passed.
- Strategy preview contains no campaign insert or update.
- Direct campaign creation without approval is rejected.
- Stale brief signatures are rejected.
- Cross-workspace preview reuse is rejected.
- Campaign insert supplies no status value.
- Legacy campaign strategy route supplies no campaign status value.
- Direct-unzip ZIP structure and integrity verified.
