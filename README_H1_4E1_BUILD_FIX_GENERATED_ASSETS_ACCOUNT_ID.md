# H1.4E1 Build Fix — generated_assets account_id TypeScript schema mismatch

This is a small build-fix patch for H1.4E1.

## Problem

Vercel failed because the checked-in Supabase TypeScript schema for `generated_assets` does not list `account_id`, so this typed Supabase query failed:

```ts
.eq("account_id", input.accountId)
```

The database/workflow expects `account_id`, but the generated TypeScript schema is stale for this table.

## Fix

The GalaxyAI media asset helper now uses the existing `untypedSupabase()` compatibility wrapper for the `generated_assets` account-scoped lookup and insert. This matches the compatibility approach already used elsewhere in this same route.

## Files changed

- `src/app/api/galaxyai/runs/[runId]/route.ts`

## SQL

No SQL is required. Apply this over H1.4E1 and redeploy.
