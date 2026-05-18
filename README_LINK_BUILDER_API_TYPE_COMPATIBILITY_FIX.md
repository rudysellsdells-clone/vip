# Link Builder API Type Compatibility Fix

## Problem

Vercel failed with:

```text
Object literal may only specify known properties, and 'user_id' does not exist in type 'never[]'
```

in:

```text
src/app/api/link-builder/backlinks/verify/route.ts
```

## Cause

The new Link Builder tables exist in the SQL migration, but the app's generated Supabase TypeScript types do not know about them yet.

Running the SQL migration in Supabase is required for runtime, but it does not automatically update the TypeScript types used during Vercel build.

## Fix

This patch adds a temporary compatibility helper:

```text
src/lib/supabase/untyped.ts
```

Then it updates all Link Builder API routes to use:

```ts
const supabase = untypedSupabase(await createClient());
```

This avoids `never` type errors for newly added tables while keeping the rest of the app unchanged.

## Files Updated

```text
src/lib/supabase/untyped.ts
src/app/api/link-builder/profile/route.ts
src/app/api/link-builder/opportunities/route.ts
src/app/api/link-builder/opportunities/[opportunityId]/score/route.ts
src/app/api/link-builder/opportunities/[opportunityId]/approve/route.ts
src/app/api/link-builder/submissions/route.ts
src/app/api/link-builder/backlinks/verify/route.ts
```

## Important

Yes, you still need to run the SQL migration in Supabase:

```text
db/migrations/20260518_directory_link_builder.sql
```

But that is for database runtime. This patch fixes the Vercel TypeScript build.

## Long-Term Better Fix

After the SQL migration is applied, regenerate Supabase types and remove this helper later.

Suggested commit message:

```text
Fix Link Builder API Supabase type compatibility
```
