# VIP Phase 3G.6 Social Publish Hosted Image Payload Patch

## Purpose

This patch makes Facebook and LinkedIn publishing payloads aware of generated/hosted social images created by the GalaxyAI image workflow.

It does not change the Zapier action key or force image publishing. It simply passes image URLs and image metadata into the Zapier MCP params so the configured action can attach media when supported.

## File included

```text
src/lib/publishing/output-payload.ts
```

## What it adds

For `facebook_post` and `linkedin_post`, VIP now looks for hosted/generated image references in asset metadata:

```text
metadata.hostedImageUrl
metadata.generatedSocialImageUrl
metadata.socialImageUrl
metadata.imageUrl
metadata.mediaUrl
```

It then includes these fields in the publishing params:

```text
hosted_image_url
generated_social_image_url
image_url
media_url
photo_url / picture for Facebook
thumbnail_url for LinkedIn
generated_social_image_asset_id
galaxyai_image_prompt_asset_id
has_generated_image
```

## Why this matters

After Phase 3G.5, the parent social post metadata can be updated with a hosted image URL. This patch makes that hosted image URL available to the publishing layer.

## Important safety behavior

- Text-only social posts still publish as before.
- If no hosted image is present, the image fields are null.
- The post body is not changed.
- The image URL is not appended to the caption.
- Zapier MCP instructions ask the action to attach the image only if the action supports media.

## LinkedIn action safety

This file also preserves the prior LinkedIn fix:

```text
LinkedIn action = create_company_update
MCP tool/executor = execute_zapier_write_action
```

It does not use `ZAPIER_LINKEDIN_MCP_TOOL_NAME` as the LinkedIn action key.

## Suggested commit message

```text
Pass hosted social image URLs to Zapier publishing payloads
```
