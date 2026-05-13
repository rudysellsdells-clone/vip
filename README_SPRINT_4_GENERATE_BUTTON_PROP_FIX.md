# Sprint 4 Generate Button Prop Fix

## Issue

Vercel failed type checking with:

```text
Property 'hasAssets' is missing in type '{ campaignId: string; }' but required in type '{ campaignId: string; hasAssets: boolean; }'.
```

## Cause

The campaign detail page calls:

```tsx
<GenerateAssetPackButton campaignId={campaign.id} />
```

But the button component required:

```ts
hasAssets: boolean
```

## Fix

This patch updates:

```text
src/components/campaigns/GenerateAssetPackButton.tsx
```

The `hasAssets` prop is now optional:

```ts
type GenerateAssetPackButtonProps = {
  campaignId: string;
  hasAssets?: boolean;
};
```

It defaults to:

```ts
hasAssets = false
```

## Apply

Copy the patched file into your repo, commit, push, and redeploy.

Suggested commit message:

```text
Fix generate button hasAssets prop
```
