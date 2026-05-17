# VIP LinkedIn Company Page Publishing

## Goal

Add LinkedIn company page post preparation for the McCormick Web Marketing LinkedIn page.

This mirrors the safety pattern already used for Facebook:

```text
Generate asset → Review → Approve → Prepare LinkedIn action → Execute through Zapier
```

## What This Adds

### New files

```text
src/lib/zapier/linkedin.ts
src/app/api/assets/[assetId]/prepare-linkedin-post/route.ts
src/components/assets/PrepareLinkedInPostButton.tsx
README_LINKEDIN_COMPANY_PAGE_PUBLISHING.md
```

### Updated files

```text
src/app/(app)/assets/[assetId]/page.tsx
src/app/(app)/settings/page.tsx
.env.example
```

## Environment Variables

Add these in Vercel:

```bash
ZAPIER_LINKEDIN_PAGE_NAME="McCormick Web Marketing"
```

Optional:

```bash
ZAPIER_LINKEDIN_ORGANIZATION_ID=
```

Use the optional organization ID only if Zapier's LinkedIn action needs a LinkedIn organization/page ID instead of the page name.

## Behavior

When an asset is:

```text
asset_type includes LinkedIn
status = approved
```

The asset detail page shows:

```text
Prepare LinkedIn Post
```

Clicking that creates a `tool_runs` record:

```text
provider = zapier_mcp
action_name = LinkedIn company page post
status = waiting_approval
requires_approval = true
approved_by_user = false
```

It also creates a `zapier_action_policies` record if one does not already exist:

```text
app_name = LinkedIn
action_name = create_company_update
risk_level = medium
approval_required = true
```

It logs activity:

```text
activity_type = zapier_action_prepared
title = LinkedIn post prepared
```

## Safety Rules

This patch does **not** auto-publish.

It only prepares the action.

Publishing still requires the existing execution/approval flow for Zapier tool runs.

## Target Page

Default LinkedIn target:

```text
McCormick Web Marketing
```

The action input explicitly says:

```text
Do not publish to a personal profile.
Target only the configured company page.
```

## Zapier MCP Setup

In Zapier MCP, make sure the LinkedIn tool/action is available.

Use the LinkedIn action that posts to a company page / organization page. Depending on the Zapier tool label, this may appear as a company update, organization update, or company page post action.

The VIP prepared input includes multiple common fields so Zapier can resolve the target:

```text
organization
organization_id
company
company_page
page
page_name
text
body
comment
update_text
post_text
content
```

## Test Plan

1. Add env var in Vercel:

```bash
ZAPIER_LINKEDIN_PAGE_NAME="McCormick Web Marketing"
```

2. Redeploy.
3. Create or open a campaign.
4. Generate assets.
5. Open the LinkedIn post asset.
6. Approve it.
7. Click **Prepare LinkedIn Post**.
8. Confirm a new `tool_runs` row exists:
   - provider: `zapier_mcp`
   - action_name: `LinkedIn company page post`
   - status: `waiting_approval`
9. Execute it through the existing Zapier tool-run flow.
10. Confirm the post publishes to the McCormick Web Marketing LinkedIn company page, not a personal profile.

## Suggested Commit Message

```text
Add LinkedIn company page publishing prep
```
