# VIP Sprint 2.18 — WordPress / Zapier Blog Publishing

## Goal

Resume the path for pushing approved blog posts to WordPress through Zapier.

This sprint changes blog posts from manual publishing items into Zapier-executable WordPress draft items.

## What This Adds

Approved blog posts now appear in:

```text
/publishing-ready
```

when they are:

```text
approved
active
scheduled or unscheduled
asset_type = blog_post
```

When due, the blog post card shows:

```text
Create WordPress Draft
```

## Files Included

```text
src/lib/publishing/asset-routing.ts
src/lib/publishing/publishing-ready-visible-types.ts
src/components/publishing/ExecuteApprovedAssetButton.tsx
src/app/api/publishing/assets/[assetId]/execute/route.ts
src/app/(app)/publishing-ready/page.tsx
README_WORDPRESS_ZAPIER_BLOG_PUBLISHING_2_18.md
```

## No SQL Required

This uses existing tables:

```text
generated_assets
publishing_execution_runs
activity_log
```

and existing scheduling fields from Sprint 2.16.

## Required Environment Variable

Add this in Vercel:

```bash
ZAPIER_WORDPRESS_CREATE_POST_ACTION_KEY=
```

Optional:

```bash
WORDPRESS_DEFAULT_POST_STATUS=draft
```

Recommended first setting:

```bash
WORDPRESS_DEFAULT_POST_STATUS=draft
```

## Zapier Action

The Zapier action should create a WordPress post.

Recommended first behavior:

```text
Create WordPress Post
Status: Draft
Title: title
Content: content
```

The VIP route sends params including:

```text
title
content
status
post_status
type
scheduled_publish_at
publish_timezone
asset_id
asset_type
source
```

## Important Behavior

For blog posts, VIP does **not** mark:

```text
scheduling_status = published
```

after the Zapier run, because the first recommended WordPress action is creating a draft, not publishing live.

The completed Zapier run still prevents duplicate draft creation.

## Workflow

```text
Blog post generated
→ quality reviewed
→ approved
→ scheduled
→ due now
→ Create WordPress Draft
→ review/publish inside WordPress
```

## Apply

1. Add/replace included files.
2. Add env var in Vercel:

```bash
ZAPIER_WORDPRESS_CREATE_POST_ACTION_KEY=
WORDPRESS_DEFAULT_POST_STATUS=draft
```

3. Commit.
4. Push.
5. Redeploy.

Suggested commit message:

```text
Add WordPress Zapier blog draft publishing
```

## Test

1. Confirm Zapier has a working WordPress Create Post action.
2. Add the action key to Vercel.
3. Approve a blog post.
4. Schedule it for now/past.
5. Open:

```text
/publishing-ready
```

6. Confirm the blog appears under Due Now.
7. Click:

```text
Create WordPress Draft
```

8. Confirm a draft appears in WordPress.
9. Confirm a completed publishing run appears in VIP.

## If the Button Errors

If VIP says the action is not configured, the env var is missing:

```bash
ZAPIER_WORDPRESS_CREATE_POST_ACTION_KEY
```

If Zapier errors, the WordPress connection/action still needs to be fixed inside Zapier.
