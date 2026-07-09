# H1.6C10 — One-Off Content Strategy Quality Fix

This patch fixes the one-off campaign asset-pack quality issue where VIP could save private prompt instructions as the finished campaign strategy.

## Problem fixed

The one-off generator could output strategy text like:

> Write to contractors and trade business owners, not to marketers. Use the user campaign brief as the controlling strategy...

That is not a campaign strategy. It is internal instruction text that leaked into the saved output.

## What changed

- Expands raw-context leak detection across the entire asset pack, not only public social/email fields.
- Rejects generated asset packs that contain private instruction phrases such as:
  - `write to ... not to marketers`
  - `use the user campaign brief`
  - `controlling strategy`
  - `translate it into natural public copy`
  - `public-facing content`
- Replaces the fallback campaign strategy with real strategy language.
- Adds a specific fallback path for first-marketing-hire campaigns.
- Makes the fallback output speak to contractors and trade business owners in plain, practical language.
- Strengthens prompt field rules so `campaignStrategy`, `audienceAngle`, and `coreMessage` must be finished strategic assets, not prompt instructions.
- Adds another guard to the one-off campaign brief to prevent private prompt instructions from being repeated in output.

## Files changed

- `src/lib/ai/asset-pack-generator.ts`
- `src/lib/ai/prompts.ts`
- `src/lib/content-generation/one-off-campaign-brief.ts`

## SQL

No SQL required.

## Testing

After applying this patch:

1. Delete/archive the bad campaign.
2. Recreate the one-off campaign.
3. Include the detailed user prompt/core messages again.
4. Generate the asset pack.
5. Review the Campaign Strategy asset first.

The strategy should now read like a real marketing direction, for example:

> Position the campaign as a practical decision checkpoint for contractors who know marketing needs attention but are not sure whether the answer is a first marketing hire, an outside partner, or a clearer system.

It should not contain private instructions like “write to contractors, not marketers.”
