# H1.6A5 Build Fix — Duplicate oneOffCampaignStrategy Key

## What this fixes

Vercel can fail the H1.6A5 build because the campaign asset generation route had a duplicated object key:

`oneOffCampaignStrategy`

inside generated asset metadata.

That duplicate happened during the patch merge for:

`src/app/api/campaigns/[campaignId]/generate/route.ts`

## What this patch changes

- Removes the duplicate metadata key.
- Keeps the one-off campaign strategy context intact.
- Leaves the one-off campaign builder behavior unchanged.

## SQL required

None.

## Apply order

Apply this after H1.6A5.

## Commit message

`H1.6A5 build fix duplicate strategy key`
