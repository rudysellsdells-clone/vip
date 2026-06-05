# VIP Phase 3G.3 Metadata Null Build Fix

## What this fixes

Vercel failed because `monthly-campaign-planner.ts` returned `metadata: null` for regular assets. The TypeScript type allows:

```ts
metadata?: Record<string, unknown>
```

That means metadata may be an object or `undefined`, but not `null`.

## File replaced

```text
src/lib/content-calendar/monthly-campaign-planner.ts
```

## Change made

Changed the fallback metadata value from:

```ts
: null;
```

to:

```ts
: undefined;
```

No behavior changed. Normal assets simply omit metadata, while campaign visual direction and GalaxyAI image prompt assets still include metadata.

## Suggested commit message

```text
Fix Phase 3G planner metadata type
```
