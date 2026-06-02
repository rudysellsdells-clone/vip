# VIP Lean WordPress ZapierMCP Payload Fix

## Problem

WordPress payload now includes `post_type`, but the MCP output showed:

```json
{
  "error": "terminated"
}
```

The payload preview showed the full long article repeated multiple times:

```text
content
body
text
post_content
postContent
```

For long blog posts, this creates an unnecessarily large MCP request.

## Fix

This patch makes the WordPress payload lean.

For `blog_post`, VIP now sends only:

```text
asset_id
asset_type
campaign_id
title
post_type
post_status
post_title
post_content
source
```

It removes duplicate full-content aliases from the WordPress payload.

## File Included

```text
src/lib/publishing/output-payload.ts
```

## Apply

Extract this ZIP directly to the repository root and redeploy.

Suggested commit message:

```text
Use lean WordPress payload for ZapierMCP
```

## Test

1. Open the same approved blog post at:

```text
/publishing-ready?asset=[assetId]
```

2. Open Payload Preview.
3. Confirm the full article appears only under:

```text
post_content
```

4. Confirm these exist:

```text
post_type: post
post_status: draft
post_title
post_content
```

5. Send to ZapierMCP again.
