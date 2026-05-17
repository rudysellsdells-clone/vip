# VIP Native Media Upload From URL for Social Posts

## Goal

Make Facebook and LinkedIn use GalaxyAI media URLs as upload sources, not as links pasted into the post body.

## Key Difference

This is not:

```text
Post text + image URL pasted into the caption
```

This is:

```text
Post text + Zapier media/file field receives GalaxyAI URL
```

That allows Zapier/Facebook/LinkedIn to pull the media from the URL and upload it as native media when the action supports it.

## Facebook Routing

Facebook now routes based on GalaxyAI media type.

### Image found

VIP prepares:

```text
Facebook Pages
action = page_photo
field source = [GalaxyAI image URL]
field message = approved Facebook post text
```

This uses Zapier's **Create Page Photo** action.

### Video found

VIP prepares:

```text
Facebook Pages
action = page_video
field source = GalaxyAI video URL
field description = approved Facebook post text
field title = asset title
```

This uses Zapier's **Create Page Video** action.

### No media found

VIP prepares:

```text
Facebook Pages
action = page_stream
field message = approved Facebook post text
```

This uses Zapier's normal **Create Page Post** action.

## LinkedIn Routing

LinkedIn's enabled Zapier action exposes an image upload field, not a video upload field.

### Image found

VIP prepares:

```text
LinkedIn
action = create_company_update
field company_id = configured LinkedIn company page
field comment = approved LinkedIn post text
field image = GalaxyAI image URL
field image_type = post_media
```

This tells Zapier to upload the image as LinkedIn post media.

### Video found but no image found

VIP does **not** paste the video URL into the post text.

The prepared action is marked:

```text
mediaUploadMode = video_upload_not_available
```

The instructions explain that the enabled LinkedIn Zapier action does not expose native video upload.

To support native LinkedIn video later, we would need either:

1. A Zapier LinkedIn action that exposes video upload, or
2. A raw LinkedIn API upload workflow.

### No media found

VIP prepares a text-only LinkedIn company update.

## Files Added/Updated

```text
src/lib/galaxyai/media.ts
src/lib/zapier/facebook.ts
src/lib/zapier/linkedin.ts
src/lib/zapier/action-registry.ts
src/app/api/assets/[assetId]/prepare-facebook-post/route.ts
src/app/api/assets/[assetId]/prepare-facebook-page-post/route.ts
src/app/api/assets/[assetId]/prepare-linkedin-post/route.ts
src/components/assets/PrepareFacebookPostButton.tsx
src/components/assets/PrepareLinkedInPostButton.tsx
.env.example
README_NATIVE_MEDIA_UPLOAD_FROM_URL_SOCIAL_POSTS.md
```

## No Database Changes

This patch uses existing tables:

```text
galaxyai_runs
generated_assets
tool_runs
activity_log
zapier_action_policies
```

## Important Zapier Actions

These need to be enabled in your Zapier MCP server.

### Facebook Pages

```text
page_photo
page_video
page_stream
```

### LinkedIn

```text
create_company_update
```

## Environment Variables

Make sure these are set in Vercel:

```bash
ZAPIER_FACEBOOK_MCP_TOOL_NAME=execute_zapier_write_action
ZAPIER_LINKEDIN_MCP_TOOL_NAME=execute_zapier_write_action

ZAPIER_FACEBOOK_PAGE_NAME="mccormick.web.marketing"
ZAPIER_LINKEDIN_PAGE_NAME="McCormick Web Marketing"
```

Optional:

```bash
ZAPIER_FACEBOOK_PAGE_ID=
ZAPIER_LINKEDIN_ORGANIZATION_ID=
```

Use the page/company IDs if Zapier requires the select field value instead of the display name.

## What to Check in Supabase

After clicking **Prepare Facebook Post** or **Prepare LinkedIn Post**, check:

```text
tool_runs.input
```

For Facebook image uploads, expect:

```json
{
  "action": "page_photo",
  "mediaUploadMode": "native_photo_upload",
  "params": {
    "page": "...",
    "source": ["https://...image.png"],
    "message": "approved post text"
  }
}
```

For Facebook video uploads, expect:

```json
{
  "action": "page_video",
  "mediaUploadMode": "native_video_upload",
  "params": {
    "page": "...",
    "source": "https://...video.mp4",
    "description": "approved post text"
  }
}
```

For LinkedIn image uploads, expect:

```json
{
  "action": "create_company_update",
  "mediaUploadMode": "native_image_upload",
  "params": {
    "company_id": "...",
    "comment": "approved post text",
    "image": "https://...image.png",
    "image_type": "post_media"
  }
}
```

## Apply

1. Replace/add the included files.
2. Commit.
3. Push.
4. Redeploy Vercel.

Suggested commit message:

```text
Upload GalaxyAI media natively to social posts
```

## Test Plan

1. Confirm GalaxyAI completed run has a public image or video URL in `galaxyai_runs.output`.
2. Approve a Facebook or LinkedIn post asset from the same campaign.
3. Click **Prepare Facebook Post** or **Prepare LinkedIn Post**.
4. Check `tool_runs.input`.
5. Confirm the correct action was selected:
   - Facebook image: `page_photo`
   - Facebook video: `page_video`
   - Facebook text-only: `page_stream`
   - LinkedIn image: `create_company_update` with `image`
6. Go to `/actions`.
7. Execute the prepared action.
8. Confirm the media uploads as native social media, not as a plain URL in the caption.
