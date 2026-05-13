# Sprint 5.1 Gmail Draft JSON Metadata Fix

## Issue

Vercel failed type checking with:

```text
Type error: Type '{ toolRunId: string; result: unknown; }' is not assignable to type 'Json | undefined'.
```

The failing block was the `metadata` value passed into `logActivity()`:

```ts
metadata: {
  toolRunId: toolRun.id,
  result,
}
```

## Cause

`result` comes back from the Zapier MCP call as `unknown`.

Supabase `jsonb` fields and the app's `logActivity()` helper expect a strict `Json` value.

## Fix

This patch updates:

```text
src/app/api/zapier/gmail-draft/execute/route.ts
```

The metadata is now converted into strict JSON before logging:

```ts
metadata: toJson({
  toolRunId: toolRun.id,
  result,
})
```

## Apply

1. Replace `src/app/api/zapier/gmail-draft/execute/route.ts`.
2. Commit.
3. Push.
4. Let Vercel redeploy.

Suggested commit message:

```text
Fix Gmail draft activity metadata JSON typing
```

## Notes

This is a TypeScript build fix only. It does not change Supabase schema and does not change the Gmail draft safety behavior.
