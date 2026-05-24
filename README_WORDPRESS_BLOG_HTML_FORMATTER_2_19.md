# VIP Sprint 2.19 — WordPress Blog HTML Formatter

## Goal

Make blog posts look better when pushed to WordPress through Zapier.

This sprint keeps the stored VIP asset reusable, but converts blog posts into clean WordPress-safe HTML only when sending to WordPress.

## What It Adds

### WordPress-safe HTML formatter

```text
src/lib/wordpress/html-formatter.ts
```

The formatter converts plain or markdown-style blog content into:

```text
h2 / h3 headings
paragraphs
unordered lists
ordered lists
strong/em text
safe links
CTA block
excerpt
```

It does **not** send a full HTML page. It only sends WordPress post body HTML.

## Updated WordPress publishing payload

```text
src/lib/publishing/asset-routing.ts
```

For `blog_post`, VIP now sends:

```text
title
content
body
post_content
excerpt
status
post_status
post_type
type
scheduled_publish_at
publish_timezone
asset_id
asset_type
source
content_format
```

The important fields are:

```text
title
content
post_status
post_type
```

## Preview Route

Adds:

```text
GET /api/assets/[assetId]/wordpress-html-preview
```

This returns the formatted HTML and excerpt for a blog post.

Useful for debugging before pushing to Zapier.

## Files Included

```text
src/lib/wordpress/html-formatter.ts
src/lib/publishing/asset-routing.ts
src/app/api/assets/[assetId]/wordpress-html-preview/route.ts
README_WORDPRESS_BLOG_HTML_FORMATTER_2_19.md
```

## No SQL Required

This only changes formatting and payload behavior.

## Optional Environment Variables

```bash
WORDPRESS_DEFAULT_POST_STATUS=draft
WORDPRESS_INCLUDE_DEFAULT_CTA=true
WORDPRESS_DEFAULT_CTA_HTML=
```

Recommended:

```bash
WORDPRESS_DEFAULT_POST_STATUS=draft
WORDPRESS_INCLUDE_DEFAULT_CTA=true
```

If you set:

```bash
WORDPRESS_DEFAULT_CTA_HTML=
```

VIP will use your custom CTA block instead of the default Web Search Pros CTA.

## How Formatting Works

If the blog content is plain text, VIP will convert it into semantic HTML.

If the blog content already includes meaningful HTML, VIP will sanitize it lightly and pass it through.

It removes internal trace lines like:

```text
Quality resubmission based on review:
Original asset ID:
Source asset:
Source asset ID:
```

## Apply

1. Add/replace included files.
2. Commit.
3. Push.
4. Redeploy.

Suggested commit message:

```text
Format WordPress blog drafts as HTML
```

## Test

1. Approve and schedule a blog post for now/past.
2. Open:

```text
/publishing-ready
```

3. Click:

```text
Create WordPress Draft
```

4. Open the draft in WordPress.
5. Confirm the body has:
   - headings
   - paragraphs
   - lists when appropriate
   - CTA block
   - cleaner visual structure

## Important

The formatter improves the post body structure. The final visual design still depends on the WordPress theme.

If the site theme has CSS for:

```text
h2
h3
p
ul
ol
.vip-cta
```

the post will look much better.
