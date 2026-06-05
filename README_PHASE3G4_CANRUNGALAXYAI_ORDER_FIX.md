# VIP Phase 3G.4 canRunGalaxyAi Build Fix

## What this fixes

Vercel failed with:

```text
Block-scoped variable 'canRunGalaxyAi' used before its declaration.
```

The Phase 3G.4 patch queried GalaxyAI workflows before declaring:

```ts
const canRunGalaxyAi = ...
```

## File replaced

```text
src/app/(app)/assets/[assetId]/page.tsx
```

## Change made

Moved the `canRunGalaxyAi` declaration above the GalaxyAI workflow query.

No behavior changed. This is only a TypeScript build-order fix.

## Suggested commit message

```text
Fix GalaxyAI image prompt asset page build order
```
