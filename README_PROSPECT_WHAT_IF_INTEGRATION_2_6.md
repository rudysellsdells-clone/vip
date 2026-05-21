# VIP Sprint 2.6 — Prospect What-If Integration

## Goal

Connect What-If Success Stories to actual prospects.

This makes the sales workflow more complete:

```text
Prospect record
→ Generate What-If Story
→ Review / approve
→ Branded PDF
→ Gmail draft with PDF
```

## What This Adds

### SQL migration

```text
db/migrations/20260521_prospect_asset_links.sql
```

Creates:

```text
prospect_asset_links
```

This table links generated assets to prospect records without modifying the existing `prospects` or `generated_assets` schemas.

### Prospect normalizer

```text
src/lib/prospects/normalizer.ts
```

Reads common prospect fields safely, such as:

```text
business_name / company_name / company
contact_name / prospect_name / name
website_url / website / domain
industry
location / city / state
notes / current_situation
pain_point
opportunity
```

### API route

```text
src/app/api/prospects/[prospectId]/what-if-stories/generate/route.ts
```

Generates a `prospect_what_if_story` asset from the prospect record and links it back to the prospect.

### Components

```text
src/components/prospects/GenerateProspectWhatIfStoryButton.tsx
src/components/prospects/ProspectWhatIfStoriesPanel.tsx
```

### New prospect-specific page

```text
src/app/(app)/prospects/[prospectId]/what-if-stories/page.tsx
```

This page lets you generate and view What-If Stories for a specific prospect.

## SQL Required

Run this in Supabase SQL Editor:

```text
db/migrations/20260521_prospect_asset_links.sql
```

It creates:

```text
prospect_asset_links
```

## No Existing Prospect Page Rewrite

This patch intentionally does not overwrite your existing prospect detail page.

To wire it into an existing prospect card/detail page, add a link like:

```tsx
<Link href={`/prospects/${prospect.id}/what-if-stories`}>
  What-If Stories
</Link>
```

## Workflow

1. Open a prospect.
2. Navigate to:

```text
/prospects/[prospectId]/what-if-stories
```

3. Click **Generate What-If Story**.
4. Open the generated asset.
5. Review / revise / approve.
6. Use existing What-If PDF + Gmail draft tools.

## Apply

1. Add included files.
2. Run SQL migration.
3. Commit.
4. Push.
5. Redeploy.

Suggested commit message:

```text
Connect What-If Stories to prospects
```

## Test

1. Confirm you have at least one prospect.
2. Open:

```text
/prospects/<prospect-id>/what-if-stories
```

3. Click **Generate What-If Story**.
4. Confirm the story appears in `/approvals`.
5. Confirm a row appears in `prospect_asset_links`.
6. Confirm the story appears on the prospect-specific What-If page.

## Next Step

Add a compact **What-If Stories** link/button directly to prospect cards or the main prospect detail page.
