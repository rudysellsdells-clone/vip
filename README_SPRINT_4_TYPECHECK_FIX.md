# Sprint 4 TypeScript Fix

This patch fixes the Vercel TypeScript build error:

```text
Type error: Type '{ assetId: any; status: any; }' is not assignable to type ...
Property 'status' does not exist on type ...
```

## File replaced

```text
src/components/approvals/AssetReviewActions.tsx
```

## What changed

`AssetReviewActions` now accepts an optional `status` prop:

```ts
type AssetReviewActionsProps = {
  assetId: string;
  status?: string | null;
};
```

This matches the usage in:

```text
src/app/(app)/approvals/page.tsx
```

and keeps the approval buttons working on campaign detail pages.
