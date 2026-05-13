# Sprint 4 GalaxyAI JSON Output Fix

## Issue

Vercel failed type checking with:

```text
Type error: Type 'GalaxyAiRunDetails' is not assignable to type 'Json | undefined'.
```

The failing line was updating the `galaxyai_runs.output` jsonb column with the raw GalaxyAI response object:

```ts
output: galaxyRun
```

## Cause

Supabase TypeScript types expect `output` to be a strict `Json` value.

The GalaxyAI response type is a custom TypeScript object, so TypeScript will not automatically treat it as `Json`.

## Fix

This patch updates:

```text
src/app/api/galaxyai/runs/[runId]/route.ts
```

The route now converts the GalaxyAI response to a strict JSON value before saving it:

```ts
function toJson(value: unknown): Json {
  return JSON.parse(JSON.stringify(value)) as Json;
}
```

Then it stores:

```ts
output: toJson(galaxyRun)
```

## Apply

1. Replace `src/app/api/galaxyai/runs/[runId]/route.ts` with the patched file.
2. Commit.
3. Push.
4. Let Vercel redeploy.

Suggested commit message:

```text
Fix GalaxyAI run output JSON typing
```

## Notes

This is a TypeScript build fix only. It does not require a Supabase schema change.
