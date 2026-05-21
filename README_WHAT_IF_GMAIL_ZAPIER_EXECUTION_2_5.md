# VIP Sprint 2.5 — What-If PDF Gmail/Zapier Execution

## Goal

Finish the What-If Story sales motion:

```text
What-If Story
→ Branded PDF
→ Gmail draft prep
→ Create actual Gmail draft through Zapier MCP
```

The email is created as a draft only. It is not sent.

## What This Adds

### New Zapier MCP write client

```text
src/lib/zapier/mcp-write-client.ts
```

This client:

- calls `execute_zapier_write_action`
- uses the MCP `tools/call` method
- sends the required Accept header:

```text
application/json, text/event-stream
```

- parses JSON and SSE-style MCP responses
- surfaces useful error messages

### New execution route

```text
src/app/api/asset-exports/[exportId]/gmail-draft/execute/route.ts
```

This route:

- loads a `gmail_draft_with_pdf` export
- accepts recipient email, cc, and bcc
- sends subject/body/PDF URL to Zapier MCP
- updates `asset_exports.status`
- logs activity
- stores the Zapier result in metadata

### New UI form

```text
src/components/what-if-stories/ExecuteGmailDraftWithPdfForm.tsx
```

Adds a recipient form and button:

```text
Create Gmail Draft
```

### Updated What-If page

```text
src/app/(app)/what-if-stories/page.tsx
```

Shows draft status and Gmail execution form when a Gmail draft export exists.

## Environment Variables

Use your existing Zapier MCP values:

```bash
ZAPIER_MCP_SERVER_URL=
ZAPIER_MCP_TOKEN=
```

Add or confirm:

```bash
ZAPIER_GMAIL_APP=gmail
ZAPIER_GMAIL_CREATE_DRAFT_ACTION=gmail_create_draft
```

If your enabled Zapier Gmail draft action has a different exact action key, update:

```bash
ZAPIER_GMAIL_CREATE_DRAFT_ACTION=
```

## No SQL Required

This uses the `asset_exports` table created in Sprint 2.4.

## Workflow

1. Open `/what-if-stories`.
2. Generate a What-If Story.
3. Generate Branded PDF.
4. Click **Prepare Gmail Draft + PDF**.
5. Enter recipient email.
6. Click **Create Gmail Draft**.
7. Confirm Gmail draft appears in Gmail.
8. Confirm `asset_exports.status = completed`.

## Apply

1. Add/replace included files.
2. Confirm env vars in Vercel.
3. Commit.
4. Push.
5. Redeploy.

Suggested commit message:

```text
Execute What-If PDF Gmail drafts through Zapier
```

## Test Notes

This patch depends on the exact Gmail action key enabled in your Zapier MCP server.

If Vercel returns:

```text
Tool not found
```

or:

```text
Action not found
```

the fix is usually to change:

```bash
ZAPIER_GMAIL_CREATE_DRAFT_ACTION
```

to the exact action key shown in Zapier MCP.

## Safety

This creates Gmail drafts only. It does not send email.
