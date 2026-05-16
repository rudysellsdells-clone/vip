# OpenAI Temperature Fix

## Issue

Campaign generation failed with:

```text
Unsupported value: 'temperature' does not support 0.7 with this model. Only the default (1) value is supported.
```

## Cause

The selected OpenAI model does not allow a custom `temperature` value.

## Fix

This patch removes custom `temperature` from both OpenAI calls:

```text
src/lib/ai/asset-pack-generator.ts
src/lib/ai/revision-generator.ts
```

The model will use its default temperature.

## Apply

1. Replace both files.
2. Commit.
3. Push.
4. Redeploy Vercel.

Suggested commit message:

```text
Remove unsupported OpenAI temperature setting
```

## Test

1. Generate assets for a campaign.
2. Request a revision on one asset.
3. Confirm neither call fails with the temperature error.
