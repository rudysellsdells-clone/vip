# H1.6C8 — Asset Pack Generation Resilience

This patch stabilizes the one-off campaign asset-pack generator.

## Why this patch exists

The campaign detail page can show "Unable to generate asset pack" when the `/api/campaigns/[campaignId]/generate` route receives a slow, failed, malformed, or empty OpenAI response. The previous generator trusted that the AI response would always match the expected JSON shape. If it returned a different object shape, empty strings, or timed out, the route could attempt to insert an empty asset list or fail before falling back.

## What changed

- Adds a usability check for generated asset packs before using them.
- Rejects malformed/empty OpenAI JSON instead of treating it as valid.
- Adds a timed OpenAI call so the route does not hang waiting too long.
- Falls back to the safe local asset pack if OpenAI fails, times out, or returns unusable JSON.
- Disables the second pre-review enrichment OpenAI call by default to avoid serverless timeouts.
- Adds campaign-detail specificity instructions to one-off asset-pack prompts.
- Adds a clear API error when a legacy campaign is not attached to an active workspace.
- Adds a defensive guard so the API never tries to insert an empty asset list.

## Environment knobs

Optional only:

- `VIP_ASSET_PACK_OPENAI_TIMEOUT_MS=18000` controls the primary OpenAI timeout.
- `VIP_ASSET_PACK_ENRICHMENT_TIMEOUT_MS=8000` controls enrichment timeout if enrichment is enabled.
- `VIP_ENABLE_PRE_REVIEW_ENRICHMENT=1` re-enables the second enrichment call.
- `VIP_DISABLE_ASSET_PACK_FALLBACK=1` disables fallback and lets OpenAI failures surface directly.

## Files changed

- `src/app/api/campaigns/[campaignId]/generate/route.ts`
- `src/lib/ai/asset-pack-generator.ts`
- `src/lib/ai/prompts.ts`

## SQL

No SQL required.

## Test

1. Unzip this patch directly into the repo root.
2. Commit and push.
3. In VIP, create a new campaign inside an active account workspace.
4. Click **Generate Asset Pack**.
5. Confirm assets are created even if OpenAI is slow or returns a bad response.
