# Sprint 5 Zapier MCP Action Preparation

## Goal

Prepare approved VIP assets for Zapier MCP-connected business apps without sending, posting, uploading, or publishing automatically.

## What This Adds

### New page

```text
/zapier
```

The page shows:

1. Approved assets ready for Zapier
2. The planned Zapier action for each approved asset
3. A button to prepare the action
4. Saved prepared actions from `tool_runs`

### New API route

```text
POST /api/zapier/prepare-action
```

This route:

1. Requires an approved asset
2. Builds a Zapier action plan
3. Saves it in `tool_runs`
4. Marks it as `waiting_approval`
5. Logs activity

## Enabled Zapier Actions Confirmed

The connected Zapier MCP server currently has these relevant apps/actions enabled:

- Gmail — `draft_v2` — Create Draft
- LinkedIn — `share` — Create Share Update
- Facebook Pages — `page_stream` — Create Page Post
- YouTube — `upload_video` — Upload Video
- Synthesia — `create_video` — Request New Video

## Asset Mapping

```text
email → Gmail Create Draft
linkedin_post → LinkedIn Create Share Update
facebook_post → Facebook Pages Create Page Post
youtube_title / youtube_description → YouTube metadata preparation
video_script / synthesia_script → Synthesia Request New Video
```

## Safety Rule

This sprint does not execute Zapier actions.

It only prepares action plans and stores them in:

```text
tool_runs
```

Actual sending, posting, publishing, uploading, or video creation remains blocked until Rudy explicitly approves the next execution step.

## Files Included

```text
src/lib/zapier/action-policy.ts
src/lib/zapier/planner.ts
src/app/api/zapier/prepare-action/route.ts
src/components/zapier/PrepareZapierActionButton.tsx
src/app/(app)/zapier/page.tsx
```

## Apply

1. Copy the files into the repo.
2. Commit.
3. Push.
4. Let Vercel redeploy.

Suggested commit message:

```text
Add Sprint 5 Zapier action preparation
```

## Test

1. Log into VIP.
2. Approve an email, LinkedIn, Facebook, YouTube, or video script asset.
3. Go to `/zapier`.
4. Click **Prepare Zapier Action**.
5. Check Supabase table `tool_runs`.
6. Confirm a new row exists with:
   - provider = `zapier_mcp`
   - status = `waiting_approval`
   - requires_approval = `true`

## Next Sprint

Sprint 5.1 should add controlled Zapier execution for one low-risk action first:

```text
Gmail Create Draft
```

That will let VIP create a Gmail draft, while still requiring Rudy to manually send it.
