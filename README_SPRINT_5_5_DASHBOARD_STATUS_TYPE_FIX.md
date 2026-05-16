# Sprint 5.5 Dashboard Status Type Fix

## Issue

Vercel failed type checking with:

```text
Type '{ id: string; title: string; subtitle: string; status: null; }[]' is not assignable to type 'RecentItem[]'.
Type 'null' is not assignable to type 'string | undefined'.
```

## Cause

The dashboard activity list was creating items with:

```ts
status: null
```

But the `RecentItem` type only allowed:

```ts
status?: string
```

## Fix

This patch updates:

```text
src/app/(app)/dashboard/page.tsx
```

Changes:

```ts
status?: string;
```

to:

```ts
status?: string | null;
```

It also removes unnecessary `status: null` from activity items.

## Apply

1. Replace `src/app/(app)/dashboard/page.tsx`.
2. Commit.
3. Push.
4. Let Vercel redeploy.

Suggested commit message:

```text
Fix dashboard recent activity status type
```
