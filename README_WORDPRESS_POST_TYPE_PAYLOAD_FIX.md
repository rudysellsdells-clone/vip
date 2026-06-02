# VIP WordPress post_type Payload Fix

## Problem

WordPress ZapierMCP execution reached the WordPress app but failed with:

```json
{
  "error": "Error from app: Required field \"post type\" (post_type) is missing."
}
```

## Meaning

The controlled ZapierMCP path is now reaching WordPress correctly, but the params payload did not include:

```text
post_type
```

## Fix

This patch updates:

```text
src/lib/publishing/output-payload.ts
```

to include WordPress-specific params for blog posts:

```text
post_type
postType
post_status
postStatus
post_title
postTitle
post_content
postContent
```

## Defaults

The default WordPress post type is:

```text
post
```

The default post status uses your existing Vercel variable:

```text
WORDPRESS_DEFAULT_POST_STATUS
```

and falls back to:

```text
draft
```

## Optional Vercel Env Var

You do not need this for standard blog posts, but you can add it if the Zapier action expects a custom post type:

```text
WORDPRESS_DEFAULT_POST_TYPE=post
```

## Apply

Extract this ZIP directly into the repository root and redeploy.

Suggested commit message:

```text
Add WordPress post type to ZapierMCP payload
```

## Test

1. Open an approved blog post at:

```text
/publishing-ready?asset=[assetId]
```

2. Open Payload Preview.
3. Confirm you see:

```json
"post_type": "post"
```

4. Click Send to ZapierMCP again.
