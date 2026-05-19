# Approve All Assets — Phase One Speed Control

## Goal

Add an **Approve All** button to the approval queue so Rudy can speed up testing and publishing preparation as VIP output gets more consistent.

## Important Behavior

This button does **not** publish anything.

It only moves all currently reviewable assets from:

```text
needs_review
revision_requested
```

to:

```text
approved
```

Publishing or external execution still happens from the relevant action flow.

## Files Added

```text
src/components/approvals/ApproveAllAssetsButton.tsx
src/app/api/approvals/approve-all/route.ts
```

## File Updated

```text
src/app/(app)/approvals/page.tsx
```

## Workflow

```text
Generate assets
→ Review batch
→ Click Approve All
→ All reviewable assets become approved
→ Prepare/execute publishing actions from the normal flow
```

## Safety

The route:

- requires authenticated user
- only approves the current user's assets
- only approves assets with reviewable statuses
- logs activity
- creates approval records where possible
- does not execute Zapier, Gmail, Facebook, LinkedIn, or YouTube actions

## Why This Fits Phase One

This is the bridge between manual approval and future auto-publishing.

It lets Rudy test faster without jumping straight to full automation.

## Apply

1. Add/replace included files.
2. Commit.
3. Push.
4. Redeploy.

Suggested commit message:

```text
Add approve all button to approval queue
```

## Test

1. Generate a campaign asset pack.
2. Open `/approvals`.
3. Confirm assets are visible.
4. Click **Approve All**.
5. Confirm the browser confirmation appears.
6. Confirm assets disappear from the approval queue.
7. Confirm approved assets can move into the normal publishing/action flow.
8. Check `activity_log` for `bulk_assets_approved`.
