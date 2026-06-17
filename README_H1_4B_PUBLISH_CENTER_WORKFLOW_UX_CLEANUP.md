# H1.4B — Publish Center Workflow UX Cleanup

## Purpose

H1.4B makes the publishing workflow easier to understand after a user approves content. The prior experience could send users from approvals to `/publishing-ready`, `/actions`, or `/publishing-schedule` without making it clear which page was the true publishing workspace.

This patch keeps the existing publishing execution logic intact and focuses on the user experience around the publishing workflow.

## Key changes

- Repositions `/publishing-schedule` as the visible **Publish Center**.
- Updates page copy so users understand that Publish Center is the primary place to act on approved content.
- Adds Publish Center metrics for approved assets, ready-now items, visible queue items, and legacy publish actions.
- Renames the old "Publish Now" language to **Ready Now**.
- Gives asset actions destination-aware labels:
  - Publish blog post
  - Publish to LinkedIn
  - Publish to Facebook
  - Create email draft
  - Publish / send
- Surfaces runnable legacy ZapierMCP publishing tool runs directly inside Publish Center so users do not have to hunt for them under Action History.
- Updates `/publishing-ready` copy so it reads like an asset-specific execution step from Publish Center, not a separate queue.
- Updates the send button to accept a destination-aware label while preserving the same backend endpoint.
- Updates `/actions` to read as **Execution History** and point users back to Publish Center for day-to-day publishing.

## Files changed

- `src/app/(app)/publishing-schedule/page.tsx`
- `src/app/(app)/publishing-ready/page.tsx`
- `src/app/(app)/actions/page.tsx`
- `src/components/publishing/SendAssetToZapierMcpButton.tsx`

## Not changed

- No database migrations.
- No Supabase schema changes.
- No Zapier MCP execution logic changes.
- No provider success guard changes.
- No LinkedIn/Facebook/Gmail payload changes.
- No account permission changes.

## Test plan

1. Create or revise a blog post.
2. Approve the blog post.
3. Open `/publishing-schedule` from the nav as **Publish Center**.
4. Confirm approved canonical assets appear in the queue when they match the current asset visibility rules.
5. Confirm older runnable ZapierMCP publishing tool runs appear under **Legacy Publish Actions**.
6. Confirm blog-related buttons say **Publish blog post** instead of generic Zapier language.
7. Click a canonical asset publishing action and confirm `/publishing-ready?asset=...` still loads the asset-specific execution screen.
8. Confirm `/actions` is still available as history/troubleshooting and no longer reads like the primary publishing destination.

## Rollback

Revert the files listed above to the previous version. This patch is UX/routing-surface only and does not migrate data.
