# Sprint 4.1 JSON Type Guard Fix

## Issue

Vercel failed type checking with:

```text
A type predicate's type must be assignable to its parameter's type.
Type 'Record<string, unknown>' is not assignable to type 'Json | undefined'.
```

The failing helper was:

```ts
function isJsonObject(value: Json | null | undefined): value is Record<string, unknown>
```

## Cause

TypeScript does not allow that predicate because `Record<string, unknown>` is wider than the custom Supabase `Json` type.

## Fix

This patch replaces that helper with:

```ts
function isPlainObject(value: unknown): value is Record<string, unknown>
```

The parameter is now `unknown`, so the type predicate is valid.

## File Patched

```text
src/app/api/galaxyai/runs/[runId]/route.ts
```

## Apply

1. Replace `src/app/api/galaxyai/runs/[runId]/route.ts`.
2. Commit.
3. Push.
4. Let Vercel redeploy.

Suggested commit message:

```text
Fix GalaxyAI JSON metadata type guard
```
