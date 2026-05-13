# Sprint 4 Null Platforms Type Fix

## Issue

Vercel failed type checking with:

```text
Type 'string[] | null' is not assignable to type 'string[]'.
```

The failing call was:

```ts
buildMarketingAssetPackUserPrompt({
  campaign,
  ...
})
```

## Cause

The updated Supabase database types correctly say:

```ts
campaign.platforms: string[] | null
```

But the prompt builder expected:

```ts
platforms: string[]
```

Even though the database usually defaults platforms to an empty array, TypeScript is correct that the value can technically be null.

## Fix

This patch updates:

```text
src/lib/ai/prompts.ts
```

The prompt builder now accepts:

```ts
platforms: string[] | null
```

and safely normalizes it with:

```ts
const platforms = campaign.platforms ?? [];
```

## Apply

1. Replace `src/lib/ai/prompts.ts` with the patched file.
2. Commit.
3. Push.
4. Redeploy in Vercel.

Suggested commit message:

```text
Fix nullable campaign platforms in prompt builder
```
