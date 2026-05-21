# Show What-If Emails in Recent Zapier Actions

## Goal

Keep this simple: show successful What-If PDF Gmail draft actions in the Recent Zapier Actions screen without forcing them into `tool_runs`.

The Gmail draft flow already works and `asset_exports` already has the durable record.

## What This Adds

### Loader

```text
src/lib/actions/what-if-gmail-action-records.ts
```

Reads:

```text
asset_exports
```

where:

```text
export_type = gmail_draft_with_pdf
status in sent_to_zapier, completed, failed
```

### Display component

```text
src/components/actions/RecentWhatIfGmailActions.tsx
```

Displays:

- Gmail draft status
- recipient
- subject
- Gmail draft link
- PDF link
- source asset link
- Zapier history link if available

## How to Add It to the Recent Zapier Actions Screen

Open the file that renders your Recent Zapier Actions area. It is likely one of these:

```text
src/app/(app)/actions/page.tsx
src/app/(app)/zapier/page.tsx
src/app/(app)/dashboard/page.tsx
```

Add the import:

```tsx
import { RecentWhatIfGmailActions } from "@/components/actions/RecentWhatIfGmailActions";
```

Then add this near the existing Recent Zapier Actions section:

```tsx
<RecentWhatIfGmailActions />
```

## Why This Is Better

The What-If Gmail draft is already recorded in:

```text
asset_exports
```

That record includes the Zapier result, Gmail draft ID, draft URL, attachment URL, recipient, and subject.

This patch simply surfaces that durable record in the same visual area where you check recent Zapier activity.

## No SQL Required

No database changes are needed.

## Apply

1. Add the included files.
2. Add the one import and component call to the Recent Zapier Actions screen.
3. Commit.
4. Push.
5. Redeploy.

Suggested commit message:

```text
Show What-If Gmail drafts in recent Zapier actions
```

## Test

1. Open the Recent Zapier Actions screen.
2. Confirm completed What-If Gmail drafts now appear.
3. Confirm links work:
   - Open Gmail draft
   - Open PDF
   - Open asset
   - Zapier history, when available

## Note

The label says **Gmail draft created**, not email sent, because VIP creates Gmail drafts and does not send them automatically.
