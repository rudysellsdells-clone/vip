# Sprint 5.2 Zapier Execution Controls

## Goal

Improve the Zapier workflow layer before adding public publishing actions.

## Current Confirmed State

Rudy confirmed:

1. Gmail draft flow works.
2. Facebook Pages access is visible in Zapier.
3. Web Search Pros page lock is not yet confirmed.

Because Facebook publishing is public and high-risk, Sprint 5.2 does not enable Facebook execution yet.

Instead, it adds better execution controls, visibility, cancellation, and explicit channel guardrails.

## What This Adds

### 1. Execution policy helper

```text
src/lib/zapier/execution-policy.ts
```

Defines which actions are executable and why others are blocked.

Currently enabled:

```text
Gmail:draft_v2
```

Currently blocked:

```text
Facebook Pages:page_stream
LinkedIn:share
YouTube:upload_video
Synthesia:create_video
```

### 2. Facebook page lock display

Reads:

```bash
ZAPIER_FACEBOOK_PAGE_NAME=
ZAPIER_FACEBOOK_PAGE_ID=
```

Facebook execution remains disabled unless:

```bash
ZAPIER_FACEBOOK_PAGE_NAME=Web Search Pros
ZAPIER_FACEBOOK_PAGE_ID=actual_page_value
```

This sprint only displays the lock status. It does not execute Facebook posts.

### 3. Cancel tool run route

Adds:

```text
POST /api/zapier/tool-runs/[toolRunId]/cancel
```

Cancelable statuses:

```text
planned
waiting_approval
failed
```

Completed actions cannot be canceled.

### 4. Better Zapier page

Updates:

```text
/zapier
```

Now shows:

- Execution controls summary
- Facebook lock status
- Prepared action JSON
- Error details
- Output details
- Retry Gmail Draft
- Cancel Action

## Files Included

```text
src/lib/zapier/execution-policy.ts
src/app/api/zapier/tool-runs/[toolRunId]/cancel/route.ts
src/components/zapier/CancelToolRunButton.tsx
src/components/zapier/ZapierStatusBadge.tsx
src/app/(app)/zapier/page.tsx
```

## Apply

1. Copy the files into the repo.
2. Commit.
3. Push.
4. Let Vercel redeploy.

Suggested commit message:

```text
Add Zapier execution controls
```

## Test

1. Go to `/zapier`.
2. Confirm Gmail Drafts show as enabled.
3. Confirm Facebook Page Lock shows blocked unless configured.
4. Prepare a Zapier action.
5. Cancel a waiting or failed action.
6. Retry a failed Gmail draft.
7. Confirm completed Gmail draft actions cannot be canceled.

## Next Sprint

Once the exact Web Search Pros Facebook Page value is confirmed, Sprint 5.3 should be:

```text
Facebook Page Locked Execution
```

That sprint should hard-block execution unless the selected page equals Web Search Pros.
