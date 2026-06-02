# VIP Missing SendAssetToZapierMcpButton Fix

## Problem

Vercel build failed with:

```text
Cannot find module '@/components/publishing/SendAssetToZapierMcpButton'
```

## Cause

`/publishing-ready/page.tsx` imports this file:

```text
src/components/publishing/SendAssetToZapierMcpButton.tsx
```

but the file is missing from the repository or was copied into the wrong path.

## Fix

Add the included file:

```text
src/components/publishing/SendAssetToZapierMcpButton.tsx
```

## Commit Message

```text
Add missing ZapierMCP send button component
```

## After Applying

Redeploy. If the next build error appears, paste that exact error. This fix only addresses the missing component import.
