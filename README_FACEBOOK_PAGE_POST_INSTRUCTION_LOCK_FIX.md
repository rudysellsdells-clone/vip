# VIP Facebook Page Post Instruction Lock Fix

## Problem

The successful Facebook MCP post used a stronger instruction:

```text
Create a Facebook Page post using the structured params provided with this tool call.

Critical:
- For the required Facebook Pages "Page" field, use exactly this value:
30489698262

Allowed Page handle / safety lock:
mccormick.web.marketing
```

The current VIP instruction was too generic and allowed ZapierMCP to ask follow-up questions or route incorrectly.

## What This Patch Does

Updates:

```text
src/lib/publishing/output-payload.ts
```

For Facebook posts, it now:

- Uses the successful Facebook-specific instruction pattern.
- Locks the Page field to `ZAPIER_FACEBOOK_PAGE_ID`.
- Adds the allowed page handle from `ZAPIER_FACEBOOK_PAGE_NAME`.
- Sends the Facebook body as `params.message`.
- Adds several page field aliases: `Page`, `page`, `page_id`, `facebook_page_id`.
- Explicitly says: `Do not route this to WordPress.`

## Required Env Vars

These should already be set:

```text
ZAPIER_FACEBOOK_PAGE_ID=30489698262
ZAPIER_FACEBOOK_PAGE_NAME=mccormick.web.marketing
```

You still need the Facebook action enabled in ZapierMCP. If the action is enabled, this instruction should match the last successful format.

## Apply

Extract directly to repo root and redeploy.

Suggested commit message:

```text
Lock Facebook Page post instruction for ZapierMCP
```
