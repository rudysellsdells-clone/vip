# Archive Filter Query Snippets

Use these snippets on older active pages to hide archived campaigns and assets.

## Campaign list pages

Add:

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

## Approval queues

Add:

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
  .in("status", ["needs_review", "approved"])
  .order("created_at", { ascending: false });
```

## Dashboard metrics

Campaign counts:

```ts
const { count } = await supabase
  .from("campaigns")
  .select("id", { count: "exact", head: true })
  .eq("user_id", user.id)
  .is("archived_at", null);
```

Asset counts:

```ts
const { count } = await supabase
  .from("generated_assets")
  .select("id", { count: "exact", head: true })
  .eq("user_id", user.id)
  .is("archived_at", null);
```

## Active asset lists

```ts
const { data: assets } = await supabase
  .from("generated_assets")
  .select("*")
  .eq("user_id", user.id)
  .is("archived_at", null);
```

## Active campaign assets

```ts
const { data: assets } = await supabase
  .from("generated_assets")
  .select("*")
  .eq("user_id", user.id)
  .eq("campaign_id", campaignId)
  .is("archived_at", null);
```
