# Sprint 5.1 Gmail Draft Retry Fix

## Issue

After the earlier Zapier MCP authorization failure, clicking **Create Gmail Draft** returned:

```text
Only waiting_approval Gmail draft actions can be executed.
```

## Cause

The first execution attempt changed the `tool_runs` row from:

```text
waiting_approval
```

to:

```text
failed
```

That was correct error tracking, but the route did not allow a failed Gmail draft action to be retried after fixing auth.

## Fix

This patch allows safe retries for Gmail draft actions with status:

```text
waiting_approval
failed
```

It does not allow retrying completed actions, so it avoids duplicate drafts after success.

## Files Included

```text
src/app/api/zapier/gmail-draft/execute/route.ts
src/components/zapier/ExecuteGmailDraftButton.tsx
src/app/(app)/zapier/page.tsx
```

## Apply

1. Replace the files in your repo.
2. Commit.
3. Push.
4. Let Vercel redeploy.

Suggested commit message:

```text
Allow retry for failed Gmail draft actions
```

## Test

1. Go to `/zapier`.
2. Find the failed Gmail draft action.
3. Click **Retry Gmail Draft**.
4. Confirm the status changes to `completed`.
5. Check Gmail Drafts.

## Alternative

You can also click **Prepare Zapier Action** again from the approved email asset to create a fresh `waiting_approval` tool run.
