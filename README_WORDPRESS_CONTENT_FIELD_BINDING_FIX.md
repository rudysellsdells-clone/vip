# VIP WordPress Content Field Binding Fix

## Problem

WordPress ZapierMCP reached the WordPress action, but returned a follow-up question:

```text
I need the actual content to proceed. Could you please provide:
1) the post_title
2) the post_content
```

This means the action received/recognized `post_type` and `post_status`, but did not bind the title/content fields.

## Fix

This patch keeps the WordPress payload controlled, but sends both common field name styles:

```text
title
content
post_title
post_content
```

It still avoids the previous oversized payload that repeated the full article under too many aliases.

## File Included

```text
src/lib/publishing/output-payload.ts
```

## Apply

Extract this ZIP directly to the repository root and redeploy.

Suggested commit message:

```text
Add WordPress title content field aliases
```

## Test

1. Open:

```text
/publishing-ready?asset=7bffa0ec-e24c-4457-bba9-62dfa09bcef7
```

2. Open Payload Preview.
3. Confirm the payload includes:

```text
post_type
post_status
title
content
post_title
post_content
```

4. Send to ZapierMCP again.

## Note

Because the last failed attempt was caught by the safety guard, the asset should remain approved and should not need another SQL reset unless it was manually changed.
