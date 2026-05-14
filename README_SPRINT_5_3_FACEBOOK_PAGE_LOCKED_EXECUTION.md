# Sprint 5.3 Facebook Page Locked Execution

## Goal

Enable Facebook Page posting only when the target Page is hard-locked to:

```text
mccormick.web.marketing
```

## Safety Rule

VIP must never post to:

- Rudy's personal Facebook profile
- Any Facebook Page other than `mccormick.web.marketing`
- Any ad/boosted placement
- Any paid campaign

## Required Vercel Variables

Set:

```bash
ZAPIER_FACEBOOK_PAGE_NAME=mccormick.web.marketing
ZAPIER_FACEBOOK_PAGE_ID=the_exact_page_value_or_id_from_zapier
```

Also confirm the existing Zapier MCP values remain set:

```bash
ZAPIER_MCP_SERVER_URL=
ZAPIER_MCP_AUTH_TOKEN=
```

Do not prefix any of these with `NEXT_PUBLIC_`.

## What This Adds

### 1. Facebook locked execution policy

Updates:

```text
src/lib/zapier/execution-policy.ts
```

Facebook execution is enabled only if the lock is configured.

### 2. Planner update

Updates:

```text
src/lib/zapier/planner.ts
```

Facebook prepared actions now include:

```text
page
pageName
requiredPageName
message
```

### 3. Execution route

Adds:

```text
POST /api/zapier/facebook-post/execute
```

This route:

1. Requires authentication
2. Confirms Facebook page lock is configured
3. Confirms the prepared action is `Facebook Pages:page_stream`
4. Confirms status is `waiting_approval` or `failed`
5. Uses the locked page value from env
6. Calls Zapier MCP
7. Saves result to `tool_runs.output`
8. Logs the activity

### 4. UI button

Adds:

```text
Publish to Locked Facebook Page
```

The button only appears when:

```text
action_name = Facebook Pages:page_stream
status = waiting_approval or failed
Facebook lock configured = true
```

The button asks for two confirmations before publishing.

## Files Included

```text
src/lib/zapier/execution-policy.ts
src/lib/zapier/planner.ts
src/app/api/zapier/facebook-post/execute/route.ts
src/components/zapier/ExecuteFacebookPostButton.tsx
src/app/(app)/zapier/page.tsx
README_SPRINT_5_3_FACEBOOK_PAGE_LOCKED_EXECUTION.md
```

## Apply

1. Copy the files into the repo.
2. Add/confirm Vercel variables.
3. Commit.
4. Push.
5. Let Vercel redeploy.

Suggested commit message:

```text
Add Facebook page locked execution
```

## Test Plan

1. Approve a `facebook_post` asset.
2. Go to `/zapier`.
3. Click **Prepare Zapier Action** for that Facebook asset.
4. Confirm the prepared action shows page name `mccormick.web.marketing`.
5. Click **Publish to Locked Facebook Page**.
6. Confirm both browser prompts.
7. Check the Facebook Page.
8. Confirm `tool_runs.status = completed`.

## If It Fails

Check:

```text
tool_runs.error
```

Likely causes:

- `ZAPIER_FACEBOOK_PAGE_ID` is not the exact Page value Zapier expects
- Facebook Pages account is not authenticated in the VIP MCP server
- Zapier MCP requires a different value for the `page` field
- The action needs additional required fields

## Next Sprint

After Facebook locked execution works, the next safest sprint is either:

```text
Sprint 5.4 LinkedIn controlled execution
```

or:

```text
Sprint 5.4 Synthesia video request execution
```
