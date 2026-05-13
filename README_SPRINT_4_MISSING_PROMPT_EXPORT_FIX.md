# Sprint 4 Missing Prompt Export Fix

## Issue

Vercel failed with:

```text
Export formatCampaignStrategyForAsset doesn't exist in target module
```

## Cause

The previous `src/lib/ai/prompts.ts` patch fixed nullable `campaign.platforms`, but it accidentally removed an exported helper that the generation route still imports.

## Fix

This patch replaces:

```text
src/lib/ai/prompts.ts
```

It restores:

```ts
formatCampaignStrategyForAsset()
```

It also includes safe helper exports for:

```ts
formatApprovalChecklistForMetadata()
formatApprovalChecklistForAsset()
```

## Apply

1. Replace `src/lib/ai/prompts.ts` with the patched file.
2. Commit.
3. Push.
4. Redeploy in Vercel.

Suggested commit message:

```text
Restore missing prompt helper exports
```
