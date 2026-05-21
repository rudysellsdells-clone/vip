# Content Calendar Generate Type Fix

## Problem

Vercel failed with:

```text
Type error: Type 'Record<string, any>' is missing the following properties from type 'CalendarItem': id, title, item_type
```

in:

```text
src/app/api/content-calendar/items/[itemId]/generate/route.ts
```

## Cause

The route used loose Supabase result typing:

```ts
Record<string, any>
```

but the generator helper expects a stricter calendar item shape.

## Fix

This patch updates only:

```text
src/app/api/content-calendar/items/[itemId]/generate/route.ts
```

It adds local row normalizers:

```ts
asCalendarItemRow()
asCalendarPlanRow()
```

so Supabase rows are converted into the expected shape before calling the helper functions.

## Apply

1. Replace the included route file.
2. Commit.
3. Push.
4. Redeploy.

Suggested commit message:

```text
Fix content calendar generation route types
```
