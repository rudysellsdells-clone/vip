# Sprint 5.8 Approvals Campaign Join Type Fix

## Issue

Vercel failed with:

```text
Property 'campaigns' does not exist on type 'never'.
```

## Cause

The approvals page used a joined Supabase select:

```ts
.select("*, campaigns(name)")
```

The app's generated Supabase TypeScript types did not understand that joined shape, so the mapped `asset` type collapsed to `never`.

## Fix

This patch removes the joined select from:

```text
src/app/(app)/approvals/page.tsx
```

The page now:

1. Loads approval assets with `.select("*")`
2. Collects campaign IDs
3. Loads campaign names separately
4. Uses a `Map` to display campaign names

## Apply

1. Replace `src/app/(app)/approvals/page.tsx`.
2. Commit.
3. Push.
4. Let Vercel redeploy.

Suggested commit message:

```text
Fix approvals campaign name type issue
```

## Notes

This does not change database schema or revision behavior. It only fixes the TypeScript build issue.
