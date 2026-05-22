# VIP Sprint 2.9 — Publishing / Execution Readiness

## Goal

Connect approved repurposed content to safe execution paths.

This sprint adds a new readiness screen:

```text
/publishing-ready
```

It supports:

```text
Approved LinkedIn post → Zapier LinkedIn action
Approved Facebook post → Zapier Facebook action
Approved email teaser → Gmail draft through Zapier
Approved video prompt → GalaxyAI media request prepared
```

## What This Adds

### SQL migration

```text
db/migrations/20260521_publishing_execution_runs.sql
```

Creates:

```text
publishing_execution_runs
```

This is the durable execution record for publishing/outreach actions.

### Routing helper

```text
src/lib/publishing/asset-routing.ts
```

Maps approved asset types to channels/providers.

### Execution route

```text
src/app/api/publishing/assets/[assetId]/execute/route.ts
```

Only runs approved assets.

It also checks for an existing completed run for the same asset/channel to prevent accidental duplicate execution.

### UI button

```text
src/components/publishing/ExecuteApprovedAssetButton.tsx
```

### New page

```text
src/app/(app)/publishing-ready/page.tsx
```

Shows:

- approved publishable assets
- execution buttons
- recent publishing execution history

## Supported Asset Types

```text
linkedin_post
facebook_post
email
video_script
```

## Required SQL

Run this in Supabase SQL Editor:

```text
db/migrations/20260521_publishing_execution_runs.sql
```

## Required / Optional Env Vars

Gmail draft action:

```bash
ZAPIER_GMAIL_APP=gmail
ZAPIER_GMAIL_CREATE_DRAFT_ACTION=draft_v2
```

LinkedIn and Facebook require exact enabled Zapier MCP action keys before they can execute:

```bash
ZAPIER_LINKEDIN_APP=linkedin
ZAPIER_LINKEDIN_CREATE_POST_ACTION=

ZAPIER_FACEBOOK_APP=facebook_pages
ZAPIER_FACEBOOK_CREATE_POST_ACTION=
```

Leave them blank until we confirm the correct action key from Zapier MCP.

GalaxyAI video prompts are prepared but not automatically sent yet:

```bash
GALAXYAI_MEDIA_REQUEST_ACTION=manual_media_request
```

## Important Behavior

This sprint is intentionally safe:

- It only executes approved assets.
- It records every run in `publishing_execution_runs`.
- It prevents duplicate completed executions for the same asset/channel.
- Gmail draft creation is supported with the known `draft_v2` action.
- LinkedIn/Facebook execution requires correct Zapier MCP action keys before use.
- GalaxyAI media request is prepared for now, not automatically sent.

## Apply

1. Add included files.
2. Run SQL migration.
3. Confirm env vars.
4. Commit.
5. Push.
6. Redeploy.

Suggested commit message:

```text
Add publishing execution readiness
```

## Test

1. Approve an email asset.
2. Open:

```text
/publishing-ready
```

3. Enter a recipient email.
4. Click **Create Gmail Draft**.
5. Confirm a publishing execution run appears.
6. Try running it again and confirm duplicate prevention works.

## Optional Navigation Link

Add a nav link to:

```text
/publishing-ready
```

Suggested label:

```text
Publishing Ready
```

Good location:

```text
Command → Publishing Ready
```

## Next Step

After this works, confirm the exact enabled Zapier MCP action keys for:

```text
LinkedIn
Facebook
```

Then set the Vercel env vars and test those channels.
