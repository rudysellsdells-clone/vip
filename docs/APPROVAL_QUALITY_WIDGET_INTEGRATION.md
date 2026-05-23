# Approval Quality Widget Integration Fix

The previous quality-aware approvals patch added the quality panel, but it did not automatically insert it into the approvals page.

This fix adds a client-safe widget that can be dropped into any approval card.

## Add this import

Open your approvals page, likely:

```text
src/app/(app)/approvals/page.tsx
```

Add:

```tsx
import { ApprovalQualityWidget } from "@/components/approvals/ApprovalQualityWidget";
```

## Add this inside each approval card

Find where each approval asset is rendered, usually something like:

```tsx
{assets.map((asset) => (
  <article key={asset.id}>
    ...
  </article>
))}
```

Inside that card, after the content preview and before the approve/revise buttons, add:

```tsx
<ApprovalQualityWidget assetId={asset.id} />
```

## Example

```tsx
<article key={asset.id} className={websiteStyles.card}>
  <h3>{asset.title}</h3>

  <p>{String(asset.content ?? "").slice(0, 240)}...</p>

  <ApprovalQualityWidget assetId={asset.id} />

  {/* Existing approve/revise buttons stay below */}
</article>
```

## What Should Show

Each approval card should show:

```text
Quality Check
Quality: Not reviewed / 85/100
Review Quality button
Request Improved Version button
Open Content Quality link
```

## Why This Version Is Safer

This widget is a client component. It can be imported into server or client approval pages and it loads the latest review through:

```text
GET /api/assets/[assetId]/quality-review/latest
```

That avoids server/client component conflicts.
