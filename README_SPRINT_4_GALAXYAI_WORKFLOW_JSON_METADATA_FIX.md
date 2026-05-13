# Sprint 4 GalaxyAI Workflow JSON Metadata Fix

## Issue

Vercel failed type checking with:

```text
Type error: Type 'GalaxyAiWorkflow' is not assignable to type 'Json | undefined'.
```

The failing line was:

```ts
metadata: workflow
```

## Cause

The `galaxyai_workflows.metadata` column is a Supabase `jsonb` column, and the TypeScript type expects a strict `Json` value.

The GalaxyAI workflow response is a custom TypeScript object, so TypeScript will not automatically accept it as JSON.

## Fix

This patch updates:

```text
src/app/api/galaxyai/workflows/route.ts
```

The route now converts each GalaxyAI workflow into strict JSON before saving it:

```ts
function toJson(value: unknown): Json {
  return JSON.parse(JSON.stringify(value)) as Json;
}
```

Then saves:

```ts
metadata: toJson(workflow)
```

## Apply

1. Replace `src/app/api/galaxyai/workflows/route.ts` with the patched file.
2. Commit.
3. Push.
4. Let Vercel redeploy.

Suggested commit message:

```text
Fix GalaxyAI workflow metadata JSON typing
```

## Notes

This is a TypeScript build fix only. It does not require a Supabase schema change.
