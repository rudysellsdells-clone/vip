# H1.4E1 Build Fix 2 — GalaxyAI existingAssets implicit any

Apply this patch over H1.4E1 and the first H1.4E1 build fix.

## Fix

Vercel strict TypeScript reported:

```txt
Parameter 'asset' implicitly has an 'any' type.
```

The query now uses the untyped Supabase compatibility wrapper, so the returned `existingAssets` array is inferred loosely. This patch adds an explicit callback type when checking for an already-saved GalaxyAI media asset:

```ts
(existingAssets ?? []).some((asset: Record<string, unknown>) => { ... })
```

## Files changed

- `src/app/api/galaxyai/runs/[runId]/route.ts`

## SQL

No SQL required.

## Behavior

No workflow behavior changes. The existing account-scoped duplicate check remains intact.
