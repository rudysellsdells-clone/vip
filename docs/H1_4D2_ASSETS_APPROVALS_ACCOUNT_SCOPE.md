# H1.4D2 — Assets and Approvals Account Scope Guard

## Purpose

H1.4D fixed the dashboard visibility leak. This patch continues the hardening pass by moving the approvals and asset review layer from legacy `user_id` assumptions toward active-account/workspace access.

This matters because client users should only review, approve, revise, archive, or restore assets that belong to their assigned active workspace.

## Files changed

```text
src/lib/accounts/asset-access.ts
src/app/(app)/approvals/page.tsx
src/app/(app)/assets/[assetId]/page.tsx
src/app/(app)/assets/[assetId]/view/page.tsx
src/app/api/assets/[assetId]/approve/route.ts
src/app/api/assets/[assetId]/reject/route.ts
src/app/api/assets/[assetId]/revise/route.ts
src/app/api/assets/[assetId]/archive/route.ts
src/app/api/assets/[assetId]/restore/route.ts
src/app/api/assets/[assetId]/approval-status/route.ts
src/app/api/approvals/approve-all/route.ts
```

## What changed

### Shared asset access helper

Added `src/lib/accounts/asset-access.ts` with:

- `getAssetAccessForUser`
- `scopeAssetQueryForAccess`
- `scopeRelatedAssetQueryForAccess`

These helpers load an asset, determine whether it belongs to an account, and then enforce account-level access through the existing H1.4C account access helper.

### Approval queue page

The approvals page now loads assets by active `account_id`, not legacy `user_id`.

### Asset detail pages

The full asset page and read-only asset view now:

- allow access by account membership when an asset has `account_id`
- fall back to legacy `user_id` only for old assets without account scope
- scope parent/child revision lookups by account when possible

### Asset action APIs

The following actions now require account manage access when the asset belongs to an account:

- approve
- reject
- revise
- archive
- restore
- approval status update
- approve all visible review assets

Legacy assets without `account_id` still fall back to the original `user_id` ownership check.

## What did not change

- No SQL changes.
- No publishing provider payloads changed.
- No Gmail/Facebook/LinkedIn/GalaxyAI execution logic changed.
- No content generation prompt logic changed.
- No destructive data changes.

## Known follow-up work

The following areas are still queued for the next H1.4D/H1.4E hardening pass:

- publishing execution routes
- publishing schedule pages and APIs
- quality review routes
- content calendar routes
- prospects/opportunities account scoping
- GalaxyAI/Luma account scoping
- remaining action history/tool run detail guards

## Test checklist

1. Sign in as MASTER.
2. Switch to the Main Client Center workspace.
3. Open `/approvals` and confirm only that workspace's assets appear.
4. Open an asset detail page and confirm it loads.
5. Approve or request revision on a safe test asset.
6. Sign in as `mainclientcenter@gmail.com`.
7. Confirm `/approvals` shows only that workspace.
8. Try manually opening an asset URL from another account and confirm it redirects or returns not found.
9. Confirm archive/restore/reject/approve actions work only on accessible account assets.
