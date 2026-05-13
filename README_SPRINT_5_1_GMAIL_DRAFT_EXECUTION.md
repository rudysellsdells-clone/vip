# Sprint 5.1 Gmail Draft Execution

## Goal

Allow VIP to execute one safe Zapier MCP action:

```text
Gmail → Create Draft
```

This creates a Gmail draft only. It does not send the email.

## Why Gmail Draft First

Gmail draft creation is the safest first Zapier execution step because:

- It does not send the email.
- Rudy can still review the draft inside Gmail.
- Rudy manually sends only if he approves.

## Required Environment Variable

Add this to Vercel:

```bash
ZAPIER_MCP_SERVER_URL=
```

This should be the Zapier MCP server URL connected to Rudy's Zapier MCP setup.

Keep it server-side only. Do not prefix it with `NEXT_PUBLIC_`.

## Files Included

```text
src/lib/zapier/mcp-client.ts
src/app/api/zapier/gmail-draft/execute/route.ts
src/components/zapier/ExecuteGmailDraftButton.tsx
src/app/(app)/zapier/page.tsx
```

## What This Adds

### 1. MCP client

Adds a lightweight server-side MCP client for calling Zapier MCP tools.

### 2. Gmail draft execution route

Adds:

```text
POST /api/zapier/gmail-draft/execute
```

This route:

1. Requires an authenticated user
2. Loads a prepared Zapier tool run
3. Confirms it is `Gmail:draft_v2`
4. Confirms it is `waiting_approval`
5. Marks it as running
6. Calls Zapier MCP to create a Gmail draft
7. Saves the output
8. Marks the tool run as completed or failed

### 3. Execute button

Adds a button on `/zapier`:

```text
Create Gmail Draft
```

This appears only for prepared Gmail draft actions with:

```text
status = waiting_approval
```

## Test Plan

1. Add `ZAPIER_MCP_SERVER_URL` to Vercel.
2. Redeploy.
3. Approve an email asset.
4. Go to `/zapier`.
5. Click **Prepare Zapier Action**.
6. Find the prepared Gmail draft action.
7. Click **Create Gmail Draft**.
8. Confirm the tool run changes to `completed`.
9. Check Gmail Drafts.

## Safety Rule

This sprint does not send email.

The route only calls:

```text
Gmail draft_v2 — Create Draft
```

It does not call:

```text
Gmail message — Send Email
```

## If Execution Fails

The error will show on `/zapier` and will also be saved in:

```text
tool_runs.error
```

Common causes:

- Missing `ZAPIER_MCP_SERVER_URL`
- Zapier MCP server URL not configured for app/server use
- Gmail account not authenticated in Zapier MCP
- MCP transport requires a slightly different request format
