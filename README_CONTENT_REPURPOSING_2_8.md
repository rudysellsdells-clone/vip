# VIP Sprint 2.8 — Content Repurposing

## Goal

Turn authority content into channel-ready assets.

This sprint lets VIP take one source asset and create:

```text
LinkedIn post
Facebook post
Email teaser
Short video prompt / script
```

## What This Adds

### New page

```text
/content-repurposing
```

### New helper

```text
src/lib/content-repurposing/generator.ts
```

### New API route

```text
src/app/api/assets/[assetId]/repurpose/route.ts
```

### New button component

```text
src/components/content-repurposing/RepurposeAssetButton.tsx
```

## Supported Source Asset Types

```text
blog_post
white_paper
authority_asset
prospect_what_if_story
```

## Generated Asset Types

```text
linkedin_post
facebook_post
email
video_script
```

Each generated asset is saved to:

```text
generated_assets
```

with:

```text
status = needs_review
```

## No SQL Required

This uses the existing:

```text
generated_assets
activity_log
```

tables.

## Workflow

```text
Open /content-repurposing
→ Choose a source asset
→ Generate Repurpose Pack
→ VIP creates 4 assets
→ Assets go to approvals
→ Review/revise/approve as normal
```

## Apply

1. Add included files.
2. Commit.
3. Push.
4. Redeploy.

Suggested commit message:

```text
Add content repurposing packs
```

## Test

1. Open `/content-repurposing`.
2. Choose a blog post, white paper, authority asset, or What-If Story.
3. Click **Generate Repurpose Pack**.
4. Confirm 4 assets are created.
5. Open `/approvals`.
6. Confirm the LinkedIn, Facebook, email, and video assets are waiting for review.

## Optional Navigation Link

Add a nav item to:

```text
/content-repurposing
```

Suggested label:

```text
Repurposing
```

Good placement:

```text
Command or Growth
```

## Notes

Repurposed assets include the source asset ID inside their content for traceability.
