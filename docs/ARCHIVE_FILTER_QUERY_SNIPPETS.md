# Archive Filter Query Snippets

Use these snippets to hide archived records from active working pages.

## Active campaign queries

Add this to active campaign lists, dashboard campaign counts, and any campaign selector:

```ts
.is("archived_at", null)
```

Example:

```ts
const { data: campaigns } = await supabase
  .from("campaigns")
  .select("*")
  .eq("user_id", user.id)
  .is("archived_at", null)
  .order("created_at", { ascending: false });
```

## Active generated asset queries

Add this to approvals, publishing, authority content, repurposing, dashboard widgets, and action queues:

```ts
.is("archived_at", null)
```

Example:

```ts
const { data: assets } = await supabase
  .from("generated_assets")
  .select("*")
  .eq("user_id", user.id)
  .is("archived_at", null)
  .order("created_at", { ascending: false });
```

## Approval queue filter

Approval queues should use:

```ts
.eq("user_id", user.id)
.is("archived_at", null)
.in("status", ["needs_review", "draft", "approved"])
```

or whatever statuses the page already uses.

## Campaign delete behavior

The delete route from the prior patch archives instead of hard-deleting. To use that behavior, the Campaigns UI delete action should call:

```ts
fetch(`/api/campaigns/${campaign.id}/delete`, { method: "POST" })
```

or DELETE if your button already uses DELETE:

```ts
fetch(`/api/campaigns/${campaign.id}/delete`, { method: "DELETE" })
```

## Best pages to update next

- `src/app/(app)/campaigns/page.tsx`
- `src/app/(app)/approvals/page.tsx`
- `src/app/(app)/dashboard/page.tsx`
- `src/app/(app)/actions/page.tsx`
- `src/app/(app)/publishing-ready/page.tsx`
- `src/app/(app)/content-repurposing/page.tsx`
- `src/app/(app)/authority-content/page.tsx`
- `src/app/(app)/phase-two/page.tsx`

## Why this matters

Archived campaigns and assets remain available in `/archive`, but they should not clutter active working pages.
