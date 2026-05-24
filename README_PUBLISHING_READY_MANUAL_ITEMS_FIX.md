# VIP Publishing Ready Manual Items Fix

## Problem

A scheduled blog post did not appear on `/publishing-ready`.

## Cause

The schedule-aware Publishing Ready page was only querying executable channel assets from:

```text
PUBLISHABLE_ASSET_TYPES
```

That usually includes things like:

```text
linkedin_post
facebook_post
email
video_script
```

But it did not include manual publishing items like:

```text
blog_post
white_paper
authority_asset
prospect_what_if_story
```

## Fix

This patch makes `/publishing-ready` show both:

```text
automated/executable assets
manual publishing assets
```

Manual assets do not show an Execute button. They show:

```text
Mark Published
```

or for What-If Stories:

```text
Mark Sent
```

## Files Included

```text
src/lib/publishing/publishing-ready-visible-types.ts
src/app/api/assets/[assetId]/mark-published/route.ts
src/components/publishing/MarkAssetPublishedButton.tsx
src/app/(app)/publishing-ready/page.tsx
README_PUBLISHING_READY_MANUAL_ITEMS_FIX.md
```

## No SQL Required

Uses existing scheduling fields:

```text
scheduled_publish_at
publish_timezone
scheduling_status
scheduling_notes
```

## What Now Appears on Publishing Ready

```text
LinkedIn posts
Facebook posts
Emails
Video scripts
Blog posts
White papers
Authority assets
What-If Stories
```

## Behavior

### Executable assets

Still use normal execution buttons:

```text
Execute LinkedIn
Execute Facebook
Create Gmail Draft
Prepare GalaxyAI
```

### Manual assets

Use:

```text
Mark Published
```

or:

```text
Mark Sent
```

This updates:

```text
scheduling_status = published
```

## Apply

1. Add/replace included files.
2. Commit.
3. Push.
4. Redeploy.

Suggested commit message:

```text
Show manual publishing assets in publishing ready
```

## Test

1. Schedule and approve a blog post.
2. Open:

```text
/publishing-ready
```

3. Confirm the blog post appears under Due Now, Upcoming, or Unscheduled.
4. If it is Due Now, click:

```text
Mark Published
```

5. Confirm it moves to Completed.
