# H1.4C Build Fix — Campaign Generate Implicit Any

## Purpose

This is a tiny TypeScript build fix for the H1.4C account-scoped route/API guard patch.

Vercel reported:

```text
Type error: Parameter 'asset' implicitly has an 'any' type.
```

The error came from the campaign generation route after the Supabase client was wrapped with `untypedSupabase`. The inserted asset rows still work at runtime, but TypeScript no longer had enough information to infer the `.find()` callback parameter type.

## File changed

```text
src/app/api/campaigns/[campaignId]/generate/route.ts
```

## What changed

- Added a small `InsertedGeneratedAsset` type.
- Cast the inserted Supabase rows to `InsertedGeneratedAsset[]` before using `.find()`.
- Reused that typed array for the activity log count and JSON response.

## What did not change

- No SQL changes.
- No publishing changes.
- No generation prompt changes.
- No provider logic changes.
- No account authorization behavior changes.

## Apply order

Apply this ZIP over the H1.4C patch, then redeploy Vercel.
