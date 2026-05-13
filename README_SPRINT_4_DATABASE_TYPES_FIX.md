# Sprint 4 Database Types Fix

## Issue

Vercel failed type checking with:

```text
Object literal may only specify known properties, and 'id' does not exist in type 'never[]'.
```

The error happened on:

```ts
await supabase.from("profiles").upsert({
  id: user.id,
  email: user.email ?? null,
  full_name: "Rudy McCormick",
  timezone: "America/Chicago"
});
```

## Cause

The temporary Supabase TypeScript file was incomplete. It did not define the `profiles` table, so TypeScript treated inserts/upserts into `profiles` as `never`.

## Fix

Replace:

```text
src/types/database.types.ts
```

with the patched file included in this ZIP.

This patch adds temporary TypeScript table definitions for all current Sprint 1–4 tables.

## Important

This is only a TypeScript build fix. It does not change your Supabase database.

Longer term, once your Supabase schema settles, generate real types from Supabase with:

```bash
npx supabase gen types typescript --project-id YOUR_PROJECT_ID --schema public > src/types/database.types.ts
```

## Apply

1. Copy the patched file into your repo.
2. Commit.
3. Push.
4. Redeploy in Vercel.

Suggested commit message:

```text
Fix Supabase database TypeScript types
```
