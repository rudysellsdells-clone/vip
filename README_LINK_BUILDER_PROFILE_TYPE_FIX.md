# Link Builder Profile Type Fix

## Problem

Vercel failed with:

```text
Property 'website_url' does not exist on type 'never'
```

in:

```text
src/app/(app)/link-builder/page.tsx
```

## Cause

The new Directory Link Builder tables are not yet represented in the generated Supabase TypeScript types. Because of that, TypeScript inferred `profileResult.data` as `never`.

## Fix

This patch updates only:

```text
src/app/(app)/link-builder/page.tsx
```

It adds explicit local types for:

```text
DirectoryProfile
DirectoryOpportunity
DirectorySubmission
AcquiredBacklink
```

Then it casts Supabase query results locally:

```ts
const profile = (profileResult.data ?? null) as DirectoryProfile | null;
```

## Apply

Replace:

```text
src/app/(app)/link-builder/page.tsx
```

Commit and redeploy.

Suggested commit message:

```text
Fix Link Builder Supabase result types
```
